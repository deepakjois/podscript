package main

import (
	"context"
	"fmt"
	"os"
)

type YTTCmd struct {
	OpenAIAPIKey    string   `name:"openai-api-key" help:"OpenAI API key" env:"OPENAI_API_KEY" hidden:""`
	AnthropicAPIKey string   `help:"Anthropic API key" env:"ANTHROPIC_API_KEY" hidden:""`
	GroqAPIKey      string   `help:"Groq API key" env:"GROQ_API_KEY" hidden:""`
	Model           LLMModel `help:"Model to use" default:"gpt-4o" short:"m"`
	VideoURL        string   `arg:"" help:"YouTube video URL" short:"u"`
	Output          string   `help:"Path to output transcript file (default: stdout)" short:"o"`
}

func (cmd *YTTCmd) getLLMClient() (LLMClient, error) {
	var provider LLMProvider

	config := &Config{
		OpenAIAPIKey:    cmd.OpenAIAPIKey,
		AnthropicAPIKey: cmd.AnthropicAPIKey,
		GroqAPIKey:      cmd.GroqAPIKey,
	}

	switch cmd.Model {
	case GPT4o, GPT4oMini:
		if config.OpenAIAPIKey == "" {
			return nil, fmt.Errorf("OpenAI API key required for model %s", cmd.Model)
		}
		provider = OpenAI
	case Claude35Sonnet, Claude35Haiku:
		if config.AnthropicAPIKey == "" {
			return nil, fmt.Errorf("Anthropic API key required for model %s", cmd.Model)
		}
		provider = Claude
	case Llama3370b, Llama318b:
		if config.GroqAPIKey == "" {
			return nil, fmt.Errorf("Groq API key required for model %s", cmd.Model)
		}
		provider = Groq
	case BedrockClaude35Sonnet, BedrockClaude35Haiku:
		existingConfig, err := ReadConfig()
		if err != nil {
			return nil, fmt.Errorf("failed to read config: %w", err)
		}
		if existingConfig.AWSRegion == "" || existingConfig.AWSAccessKeyID == "" || existingConfig.AWSSecretAccessKey == "" {
			return nil, fmt.Errorf("AWS credentials required for model %s. Run 'podscript configure' to set them up", cmd.Model)
		}
		provider = Bedrock
		config = existingConfig
	default:
		return nil, fmt.Errorf("unsupported model: %s", cmd.Model)
	}

	return NewLLMClient(provider, config)
}

func (cmd *YTTCmd) Run() error {
	client, err := cmd.getLLMClient()
	if err != nil {
		return err
	}

	out := os.Stdout
	if cmd.Output != "" {
		f, err := os.Create(cmd.Output)
		if err != nil {
			return fmt.Errorf("failed to create output file: %w", err)
		}
		defer f.Close()
		out = f
	}

	transcriber := NewYouTubeTranscriber(client, cmd.Model)
	err = transcriber.Transcribe(context.Background(), cmd.VideoURL,
		func(text string, done bool) error {
			_, err := fmt.Fprint(out, text)
			return err
		})
	fmt.Println()
	return err
}
