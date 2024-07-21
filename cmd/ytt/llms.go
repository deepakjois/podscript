package ytt

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/liushuangls/go-anthropic/v2"
	"github.com/sashabaranov/go-openai"
)

type Model string

const (
	ChatGPT4o                 Model = openai.GPT4o
	ChatGpt4oMini             Model = openai.GPT4oMini
	Claude3Dot5Sonnet20240620 Model = anthropic.ModelClaude3Dot5Sonnet20240620
)

var (
	maxTokens map[Model]int = map[Model]int{
		ChatGPT4o:                 4096,
		ChatGpt4oMini:             10000,
		Claude3Dot5Sonnet20240620: 8192}
)

type TranscriptCleaner interface {
	CleanupTranscript(string) (string, error)
}

type OpenAITranscriptCleaner struct {
	client *openai.Client
	model  Model
}

type AnthropicTranscriptCleaner struct {
	client *anthropic.Client
}

func NewOpenAITranscriptCleaner(apiKey string, model Model) TranscriptCleaner {
	return &OpenAITranscriptCleaner{
		client: openai.NewClient(apiKey),
		model:  model,
	}
}

func NewAnthropicTranscriptCleaner(apiKey string) TranscriptCleaner {
	return &AnthropicTranscriptCleaner{
		client: anthropic.NewClient(apiKey, anthropic.WithBetaVersion(anthropic.BetaMaxTokens35Sonnet20240715)),
	}
}

func (tc *OpenAITranscriptCleaner) CleanupTranscript(text string) (string, error) {
	req := openai.ChatCompletionRequest{
		Model: string(tc.model),
		Messages: []openai.ChatCompletionMessage{
			{
				Role:    openai.ChatMessageRoleUser,
				Content: fmt.Sprintf(userPrompt, text),
			},
		},
		MaxTokens: maxTokens[tc.model],
	}

	backOff := backoff.NewExponentialBackOff()
	backOff.MaxElapsedTime = 10 * time.Minute

	var resp openai.ChatCompletionResponse

	err := backoff.Retry(func() (err error) {
		resp, err = tc.client.CreateChatCompletion(context.Background(), req)
		if err != nil {
			// Check if the error is a 429 (Too Many Requests) error
			var openAIError *openai.APIError
			if errors.As(err, &openAIError) {
				if openAIError.HTTPStatusCode == http.StatusTooManyRequests {
					// This is a 429 error, so we'll retry
					fmt.Printf("%v\n", err)
					fmt.Println("Retrying…")
					return err
				}
			}
			// For any other error, we'll stop retrying
			return backoff.Permanent(err)
		}
		return nil
	}, backOff)

	if err != nil {
		return "", err
	}
	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no choices returned from API")
	}

	// TODO: Log this as debug output
	// fmt.Printf("Usage: %+v\n", resp.Usage)
	return resp.Choices[0].Message.Content, nil
}

func (tc *AnthropicTranscriptCleaner) CleanupTranscript(text string) (string, error) {

	req := &anthropic.MessagesRequest{
		Model: string(Claude3Dot5Sonnet20240620),
		Messages: []anthropic.Message{
			anthropic.NewUserTextMessage(fmt.Sprintf(userPrompt, text)),
		},
		MaxTokens: 8192,
	}

	backOff := backoff.NewExponentialBackOff()
	backOff.MaxElapsedTime = 10 * time.Minute

	var resp anthropic.MessagesResponse

	err := backoff.Retry(func() (err error) {
		resp, err = tc.client.CreateMessages(context.Background(), *req)
		if err != nil {
			var anthropicAPIError *anthropic.APIError
			if errors.As(err, &anthropicAPIError) {
				if anthropicAPIError.IsRateLimitErr() || anthropicAPIError.IsOverloadedErr() {
					fmt.Printf("%v\n", err)
					fmt.Println("Retrying…")
					return err
				}
			}
			// For any other error, we'll stop retrying
			return backoff.Permanent(err)
		}
		return nil
	}, backOff)

	if err != nil {
		return "", err
	}

	// TODO: Log this as debug output
	// fmt.Printf("Usage: %+v\n", resp.Usage)
	return resp.GetFirstContentText(), nil

}
