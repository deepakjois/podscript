package main

import (
	"context"
	"fmt"

	"github.com/anthropics/anthropic-sdk-go"
	anthropicoption "github.com/anthropics/anthropic-sdk-go/option"

	"github.com/openai/openai-go"
	openoption "github.com/openai/openai-go/option"

	"github.com/deepakjois/groq"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type LLMProvider string

const (
	OpenAI LLMProvider = "openai"
	Claude LLMProvider = "claude"
	Groq   LLMProvider = "groq"
	Gemini LLMProvider = "gemini"
)

type LLMModel string

const (
	GPT4o          LLMModel = "gpt-4o"
	GPT4oMini      LLMModel = "gpt-4o-mini"
	Claude35Sonnet LLMModel = "claude-3-5-sonnet-20241022"
	Claude35Haiku  LLMModel = "claude-3-5-haiku-20241022"
	Llama3370b     LLMModel = "llama-3.3-70b-versatile"
	Llama318b      LLMModel = "llama-3.1-8b-instant"
	// Gemini models
	Gemini2Flash LLMModel = "gemini-2.0-flash"
)

// output token limits for each model
var modelTokenLimits = map[LLMModel]int{
	GPT4o:          16384,
	GPT4oMini:      16384,
	Claude35Sonnet: 8192,
	Claude35Haiku:  8192,
	Llama3370b:     32768,
	Llama318b:      8192,
	Gemini2Flash:   32768,
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

func NewLLMClient(provider LLMProvider, apiKey string) (LLMClient, error) {
	switch provider {
	case OpenAI:
		return NewOpenAIClient(apiKey), nil
	case Claude:
		return NewClaudeClient(apiKey), nil
	case Groq:
		return NewGroqClient(apiKey), nil
	case Gemini:
		return NewGeminiClient(apiKey), nil
	default:
		return nil, fmt.Errorf("unsupported provider: %s", provider)
	}
}

type OpenAIClient struct {
	client *openai.Client
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
			Model: openai.F(string(req.Model)),
			Messages: openai.F([]openai.ChatCompletionMessageParamUnion{
				openai.SystemMessage(req.SystemPrompt),
				openai.UserMessage(req.UserPrompt),
			}),
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
				Model: openai.F(string(req.Model)),
				Messages: openai.F([]openai.ChatCompletionMessageParamUnion{
					openai.SystemMessage(req.SystemPrompt),
					openai.UserMessage(req.UserPrompt),
				}),
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
				if err.Error() == "iterator done" {
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
	client *anthropic.Client
}

func NewClaudeClient(apiKey string) *ClaudeClient {
	return &ClaudeClient{
		client: anthropic.NewClient(anthropicoption.WithAPIKey(apiKey)),
	}
}

func (c *ClaudeClient) Complete(ctx context.Context, req CompletionRequest) (*CompletionResponse, error) {
	params := anthropic.MessageNewParams{
		Model:     anthropic.F(string(req.Model)),
		MaxTokens: anthropic.F(int64(modelTokenLimits[req.Model])),
		Messages: anthropic.F([]anthropic.MessageParam{
			anthropic.NewUserMessage(anthropic.NewTextBlock(req.UserPrompt)),
		}),
	}

	if req.SystemPrompt != "" {
		params.System = anthropic.F([]anthropic.TextBlockParam{
			anthropic.NewTextBlock(req.SystemPrompt),
		})
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
			Model:     anthropic.F(string(req.Model)),
			MaxTokens: anthropic.F(int64(modelTokenLimits[req.Model])),
			Messages: anthropic.F([]anthropic.MessageParam{
				anthropic.NewUserMessage(anthropic.NewTextBlock(req.UserPrompt)),
			}),
		}

		if req.SystemPrompt != "" {
			params.System = anthropic.F([]anthropic.TextBlockParam{
				anthropic.NewTextBlock(req.SystemPrompt),
			})
		}

		stream := c.client.Messages.NewStreaming(ctx, params)
		message := anthropic.Message{}
		for stream.Next() {
			event := stream.Current()
			message.Accumulate(event)

			switch delta := event.Delta.(type) {
			case anthropic.ContentBlockDeltaEventDelta:
				if delta.Text != "" {
					chunkChan <- CompletionChunk{
						Text:     delta.Text,
						Provider: Claude,
						Done:     false,
					}
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
