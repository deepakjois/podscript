package ytt

import (
	"errors"
	"fmt"
	"unicode"

	"github.com/spf13/viper"
	"github.com/tmc/langchaingo/llms"
	"github.com/tmc/langchaingo/llms/anthropic"
	"github.com/tmc/langchaingo/llms/openai"
	"github.com/tmc/langchaingo/textsplitter"
)

type Model string

const (
	ChatGPT4o                 Model = "gpt-4o"
	ChatGpt4oMini             Model = "gpt-4o-mini"
	Claude3Dot5Sonnet20240620 Model = "claude-3-5-sonnet-20240620"
	GroqLlama3170B            Model = "llama-3.1-70b-versatile"
)

var (
	maxTokens map[Model]int = map[Model]int{
		ChatGPT4o:                 4096,
		ChatGpt4oMini:             10000,
		Claude3Dot5Sonnet20240620: 8192,
		GroqLlama3170B:            8192,
	}
)

func getModel(model Model) (llms.Model, error) {
	switch model {
	case ChatGPT4o, ChatGpt4oMini:
		openaiApiKey := viper.GetString("openai_api_key")
		if openaiApiKey == "" {
			return nil, errors.New("OpenAI API key not found. Please run 'podscript configure' or set the OPENAI_API_KEY environment variable")
		}
		return openai.New(openai.WithToken(openaiApiKey), openai.WithModel(string(model)))
	case Claude3Dot5Sonnet20240620:
		anthropicApiKey := viper.GetString("anthropic_api_key")
		if anthropicApiKey == "" {
			return nil, errors.New("Anthropic API key not found. Please run 'podscript configure' or set the ANTHROPIC_API_KEY environment variable")
		}
		return anthropic.New(anthropic.WithToken(anthropicApiKey), anthropic.WithModel(string(model)), anthropic.WithAnthropicBetaHeader(anthropic.MaxTokensAnthropicSonnet35))
	case GroqLlama3170B:
		groqApiKey := viper.GetString("groq_api_key")
		if groqApiKey == "" {
			return nil, errors.New("Groq API key not found. Please run 'podscript configure' or set the GROQ_API_KEY environment variable")
		}
		return openai.New(
			openai.WithToken(groqApiKey),
			openai.WithModel(string(model)),
			openai.WithBaseURL("https://api.groq.com/openai/v1"),
		)
	default:
		panic(fmt.Sprintf("Invalid model %s. Should not get here!", model))
	}
}

func calcWordsFromTokens(tokens int) int {
	// round down to nearest 1000
	return int((float64(tokens)*0.75)/1000) * 1000
}

func countWords(s string) int {
	count := 0
	inWord := false

	for _, char := range s {
		if unicode.IsSpace(char) {
			inWord = false
		} else if !inWord {
			inWord = true
			count++
		}
	}

	return count
}

func splitText(text string, model Model) ([]string, error) {
	maxChunkSize := calcWordsFromTokens(maxTokens[model])
	splitter := textsplitter.NewRecursiveCharacter(
		textsplitter.WithChunkSize(maxChunkSize),
		textsplitter.WithChunkOverlap(0),
		textsplitter.WithLenFunc(countWords),
	)
	return splitter.SplitText(text)
}
