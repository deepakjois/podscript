package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/anthropics/anthropic-sdk-go"
	anthropicoption "github.com/anthropics/anthropic-sdk-go/option"

	"github.com/openai/openai-go"
	openoption "github.com/openai/openai-go/option"

	"github.com/deepakjois/groq"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime/types"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

type LLMProvider string

const (
	OpenAI  LLMProvider = "openai"
	Claude  LLMProvider = "claude"
	Groq    LLMProvider = "groq"
	Gemini  LLMProvider = "gemini"
	Bedrock LLMProvider = "bedrock"
)

type LLMModel string

const (
	GPT4o          LLMModel = "gpt-4o"
	GPT4oMini      LLMModel = "gpt-4o-mini"
	Claude37Sonnet LLMModel = "claude-3-7-sonnet-20250219"
	Claude35Haiku  LLMModel = "claude-3-5-haiku-20241022"
	Llama3370b     LLMModel = "llama-3.3-70b-versatile"
	Llama318b      LLMModel = "llama-3.1-8b-instant"
	// Gemini models
	Gemini2Flash LLMModel = "gemini-2.0-flash"
	// Bedrock models
	BedrockClaude35Haiku  LLMModel = "anthropic.claude-3-5-haiku-20241022-v1:0"
	BedrockClaude37Sonnet LLMModel = "anthropic.claude-3-7-sonnet-20250219-v1:0"
)

// output token limits for each model
var modelTokenLimits = map[LLMModel]int{
	GPT4o:                 16384,
	GPT4oMini:             16384,
	Claude37Sonnet:        8192,
	Claude35Haiku:         8192,
	Llama3370b:            32768,
	Llama318b:             8192,
	Gemini2Flash:          8192,
	BedrockClaude37Sonnet: 4096,
	BedrockClaude35Haiku:  4096,
}

// CompletionRequest represents a generic completion request
type CompletionRequest struct {
	SystemPrompt string
	UserPrompt   string
	Model        LLMModel
}

// CompletionChunk represents a piece of streamed response
type CompletionChunk struct {
	Text     string
	Provider LLMProvider
	Done     bool // Indicates if this is the last chunk
}

// CompletionResponse represents a complete response (for non-streaming requests)
type CompletionResponse struct {
	Text     string
	Provider LLMProvider
}

// LLMClient interface defines the common contract for all LLM providers
type LLMClient interface {
	Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error)
	CompleteStream(ctx context.Context, req CompletionRequest) (<-chan CompletionChunk, <-chan error)
}

func NewLLMClient(provider LLMProvider, config Config) (LLMClient, error) {
	switch provider {
	case OpenAI:
		return NewOpenAIClient(config.OpenAIAPIKey), nil
	case Claude:
		return NewClaudeClient(config.AnthropicAPIKey), nil
	case Groq:
		return NewGroqClient(config.GroqAPIKey), nil
	case Gemini:
		return NewGeminiClient(config.GeminiAPIKey), nil
	case Bedrock:
		return NewBedrockClient(config.AWSRegion, config.AWSAccessKeyID, config.AWSSecretAccessKey, config.AWSSessionToken)
	default:
		return nil, fmt.Errorf("unsupported provider: %s", provider)
	}
}

type OpenAIClient struct {
	client openai.Client
}

func NewOpenAIClient(apiKey string) *OpenAIClient {
	return &OpenAIClient{
		client: openai.NewClient(openoption.WithAPIKey(apiKey)),
	}
}

func (c *OpenAIClient) Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error) {
	resp, err := c.client.Chat.Completions.New(
		ctx,
		openai.ChatCompletionNewParams{
			Model: openai.ChatModel(string(req.Model)),
			Messages: []openai.ChatCompletionMessageParamUnion{
				openai.SystemMessage(req.SystemPrompt),
				openai.UserMessage(req.UserPrompt),
			},
		},
	)

	if err != nil {
		return nil, err
	}

	return &CompletionResponse{
		Text:     resp.Choices[0].Message.Content,
		Provider: OpenAI,
	}, nil
}

func (c *OpenAIClient) CompleteStream(ctx context.Context, req CompletionRequest) (<-chan CompletionChunk, <-chan error) {
	chunkChan := make(chan CompletionChunk)
	errChan := make(chan error, 1)

	go func() {
		defer close(chunkChan)
		defer close(errChan)

		stream := c.client.Chat.Completions.NewStreaming(
			ctx,
			openai.ChatCompletionNewParams{
				Model: openai.ChatModel(string(req.Model)),
				Messages: []openai.ChatCompletionMessageParamUnion{
					openai.SystemMessage(req.SystemPrompt),
					openai.UserMessage(req.UserPrompt),
				},
			},
		)

		for stream.Next() {
			chunk := stream.Current()
			if len(chunk.Choices) > 0 {
				chunkChan <- CompletionChunk{
					Text:     chunk.Choices[0].Delta.Content,
					Provider: OpenAI,
					Done:     false,
				}
			}
		}

		if err := stream.Err(); err != nil {
			errChan <- err
			return
		}

		// Send final done chunk
		chunkChan <- CompletionChunk{
			Done: true,
		}
	}()

	return chunkChan, errChan
}

type GeminiClient struct {
	client *genai.Client
	model  *genai.GenerativeModel
}

func NewGeminiClient(apiKey string) *GeminiClient {
	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		panic(fmt.Sprintf("failed to create Gemini client: %v", err))
	}

	model := client.GenerativeModel("gemini-2.0-flash")
	return &GeminiClient{
		client: client,
		model:  model,
	}
}

func (c *GeminiClient) Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error) {
	prompt := req.UserPrompt
	if req.SystemPrompt != "" {
		prompt = req.SystemPrompt + "\n\n" + req.UserPrompt
	}

	resp, err := c.model.GenerateContent(ctx, genai.Text(prompt))
	if err != nil {
		return nil, fmt.Errorf("failed to generate content: %w", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no content in response")
	}

	return &CompletionResponse{
		Text:     fmt.Sprint(resp.Candidates[0].Content.Parts[0]),
		Provider: Gemini,
	}, nil
}

func (c *GeminiClient) CompleteStream(ctx context.Context, req CompletionRequest) (<-chan CompletionChunk, <-chan error) {
	chunkChan := make(chan CompletionChunk)
	errChan := make(chan error, 1)

	go func() {
		defer close(chunkChan)
		defer close(errChan)

		prompt := req.UserPrompt
		if req.SystemPrompt != "" {
			prompt = req.SystemPrompt + "\n\n" + req.UserPrompt
		}

		iter := c.model.GenerateContentStream(ctx, genai.Text(prompt))
		for {
			resp, err := iter.Next()
			if err != nil {
				if errors.Is(err, iterator.Done) {
					break
				}
				errChan <- fmt.Errorf("stream error: %w", err)
				return
			}

			if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
				chunkChan <- CompletionChunk{
					Text:     fmt.Sprint(resp.Candidates[0].Content.Parts[0]),
					Provider: Gemini,
					Done:     false,
				}
			}
		}

		// Send final done chunk
		chunkChan <- CompletionChunk{
			Done: true,
		}
	}()

	return chunkChan, errChan
}

type ClaudeClient struct {
	client anthropic.Client
}

func NewClaudeClient(apiKey string) *ClaudeClient {
	return &ClaudeClient{
		client: anthropic.NewClient(anthropicoption.WithAPIKey(apiKey)),
	}
}

func (c *ClaudeClient) Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error) {
	params := anthropic.MessageNewParams{
		Model:     anthropic.Model(string(req.Model)),
		MaxTokens: int64(modelTokenLimits[req.Model]),
		Messages: []anthropic.MessageParam{
			anthropic.NewUserMessage(anthropic.NewTextBlock(req.UserPrompt)),
		},
	}

	if req.SystemPrompt != "" {
		params.System = []anthropic.TextBlockParam{
			{Text: req.SystemPrompt},
		}
	}

	resp, err := c.client.Messages.New(ctx, params)
	if err != nil {
		return nil, err
	}

	return &CompletionResponse{
		Text:     resp.Content[0].Text,
		Provider: Claude,
	}, nil
}

func (c *ClaudeClient) CompleteStream(ctx context.Context, req CompletionRequest) (<-chan CompletionChunk, <-chan error) {
	chunkChan := make(chan CompletionChunk)
	errChan := make(chan error, 1)

	go func() {
		defer close(chunkChan)
		defer close(errChan)

		params := anthropic.MessageNewParams{
			Model:     anthropic.Model(string(req.Model)),
			MaxTokens: int64(modelTokenLimits[req.Model]),
			Messages: []anthropic.MessageParam{
				anthropic.NewUserMessage(anthropic.NewTextBlock(req.UserPrompt)),
			},
		}

		if req.SystemPrompt != "" {
			params.System = []anthropic.TextBlockParam{
				{Text: req.SystemPrompt},
			}
		}

		stream := c.client.Messages.NewStreaming(ctx, params)
		message := anthropic.Message{}
		for stream.Next() {
			event := stream.Current()
			message.Accumulate(event)

			if event.Delta.Type == "content_block_delta" && event.Delta.Text != "" {
				chunkChan <- CompletionChunk{
					Text:     event.Delta.Text,
					Provider: Claude,
					Done:     false,
				}
			}
		}

		if err := stream.Err(); err != nil {
			errChan <- err
			return
		}

		// Send final done chunk
		chunkChan <- CompletionChunk{
			Done: true,
		}
	}()

	return chunkChan, errChan
}

type GroqClient struct {
	client *groq.Client
}

func NewGroqClient(apiKey string) *GroqClient {
	return &GroqClient{
		client: groq.NewClient(groq.WithAPIKey(apiKey)),
	}
}

func (c *GroqClient) Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error) {
	resp, err := c.client.CreateChatCompletion(groq.CompletionCreateParams{
		Model: string(req.Model),
		Messages: []groq.Message{
			{Role: "system", Content: req.SystemPrompt},
			{Role: "user", Content: req.UserPrompt},
		},
		Stream: false,
	})
	if err != nil {
		return nil, err
	}

	return &CompletionResponse{
		Text:     resp.Choices[0].Message.Content,
		Provider: Groq,
	}, nil
}

func (c *GroqClient) CompleteStream(ctx context.Context, req CompletionRequest) (<-chan CompletionChunk, <-chan error) {
	chunkChan := make(chan CompletionChunk)
	errChan := make(chan error, 1)

	go func() {
		defer close(chunkChan)
		defer close(errChan)

		resp, err := c.client.CreateChatCompletion(groq.CompletionCreateParams{
			Model: string(req.Model),
			Messages: []groq.Message{
				{Role: "system", Content: req.SystemPrompt},
				{Role: "user", Content: req.UserPrompt},
			},
			Stream: true,
		})
		if err != nil {
			errChan <- err
			return
		}

		for chunk := range resp.Stream {
			if len(chunk.Choices) > 0 {
				chunkChan <- CompletionChunk{
					Text:     chunk.Choices[0].Delta.Content,
					Provider: Groq,
					Done:     false,
				}
			}
		}

		// Send final done chunk
		chunkChan <- CompletionChunk{
			Done: true,
		}
	}()

	return chunkChan, errChan
}

type BedrockClient struct {
	client      *bedrockruntime.Client
	temperature float32
}

func NewBedrockClient(region, accessKeyID, secretAccessKey string, sessionToken string) (*BedrockClient, error) {
	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			accessKeyID,
			secretAccessKey,
			sessionToken,
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := bedrockruntime.NewFromConfig(cfg)
	return &BedrockClient{
		client:      client,
		temperature: 0,
	}, nil
}

func (c *BedrockClient) buildRequest(req CompletionRequest) BedrockCompletionRequest {
	return BedrockCompletionRequest{
		AnthropicVersion: BedrockAnthropicVersion,
		MaxTokens:        modelTokenLimits[req.Model],
		Temperature:      c.temperature,
		System:           req.SystemPrompt,
		Messages: []BedrockMessage{
			{
				Role: "user",
				Content: []BedrockMessageBlock{
					{
						Type: "text",
						Text: req.UserPrompt,
					},
				},
			},
		},
	}
}

func (c *BedrockClient) invokeModel(ctx context.Context, modelID string, body []byte) (*bedrockruntime.InvokeModelOutput, error) {
	return c.client.InvokeModel(ctx, &bedrockruntime.InvokeModelInput{
		ModelId:     aws.String(modelID),
		ContentType: aws.String(BedrockContentType),
		Body:        body,
	})
}

func (c *BedrockClient) invokeModelStream(ctx context.Context, modelID string, body []byte) (*bedrockruntime.InvokeModelWithResponseStreamOutput, error) {
	return c.client.InvokeModelWithResponseStream(ctx, &bedrockruntime.InvokeModelWithResponseStreamInput{
		ModelId:     aws.String(modelID),
		ContentType: aws.String(BedrockContentType),
		Body:        body,
	})
}

func (c *BedrockClient) Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error) {
	bedrockReq := c.buildRequest(req)
	body, err := json.Marshal(bedrockReq)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	output, err := c.invokeModel(ctx, string(req.Model), body)
	if err != nil {
		return nil, fmt.Errorf("failed to invoke model: %w", err)
	}

	var response BedrockCompletionResponse
	if err := json.Unmarshal(output.Body, &response); err != nil {
		return nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	return &CompletionResponse{
		Text:     response.Content[0].Text,
		Provider: Bedrock,
	}, nil
}

func (c *BedrockClient) CompleteStream(ctx context.Context, req CompletionRequest) (<-chan CompletionChunk, <-chan error) {
	chunkChan := make(chan CompletionChunk)
	errChan := make(chan error, 1)

	go func() {
		defer close(chunkChan)
		defer close(errChan)

		bedrockReq := c.buildRequest(req)
		body, err := json.Marshal(bedrockReq)
		if err != nil {
			errChan <- fmt.Errorf("failed to marshal request: %w", err)
			return
		}

		output, err := c.invokeModelStream(ctx, string(req.Model), body)
		if err != nil {
			errChan <- fmt.Errorf("failed to invoke model: %w", err)
			return
		}

		for event := range output.GetStream().Events() {
			switch v := event.(type) {
			case *types.ResponseStreamMemberChunk:
				var output BedrockStreamCompletionResponse
				if err := json.Unmarshal(v.Value.Bytes, &output); err != nil {
					errChan <- fmt.Errorf("failed to decode chunk: %w", err)
					return
				}
				if output.Type == "content_block_delta" && output.Delta.Text != "" {
					chunkChan <- CompletionChunk{
						Text:     output.Delta.Text,
						Provider: Bedrock,
						Done:     false,
					}
				}
			case *types.UnknownUnionMember:
				errChan <- fmt.Errorf("unknown response stream event: %s", v.Tag)
				return
			default:
				if event == nil {
					errChan <- fmt.Errorf("received nil event")
					return
				}
				errChan <- fmt.Errorf("received unknown event type: %T", event)
				return
			}
		}

		// Send final done chunk
		chunkChan <- CompletionChunk{
			Done: true,
		}
	}()

	return chunkChan, errChan
}
