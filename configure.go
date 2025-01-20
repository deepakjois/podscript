package main

import (
	"fmt"
	"os"
	"path"
	"strings"

	"github.com/charmbracelet/huh"
	"github.com/pelletier/go-toml"
)

type Config struct {
	AssemblyAIAPIKey string `toml:"assembly-ai-api-key"`
	DeepgramAPIKey   string `toml:"deepgram-api-key"`
	GroqAPIKey       string `toml:"groq-api-key"`
	AnthropicAPIKey  string `toml:"anthropic-api-key"`
	OpenAIAPIKey     string `toml:"openai-api-key"`
}

type ConfigureCmd struct{}

func (c *ConfigureCmd) Run() error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("error getting home directory: %w", err)
	}

	configPath := path.Join(homeDir, ".podscript.toml")
	config := &Config{}

	// Read existing config if it exists
	if _, err := os.Stat(configPath); err == nil {
		data, err := os.ReadFile(configPath)
		if err != nil {
			return fmt.Errorf("error reading config file: %w", err)
		}
		if err := toml.Unmarshal(data, config); err != nil {
			return fmt.Errorf("error parsing config file: %w", err)
		}
	}

	// Prompt for each API key
	prompts := []struct {
		title string
		value *string
	}{
		{"OpenAI API key", &config.OpenAIAPIKey},
		{"Anthropic API key", &config.AnthropicAPIKey},
		{"Deepgram API key", &config.DeepgramAPIKey},
		{"Groq API key", &config.GroqAPIKey},
		{"AssemblyAI API key", &config.AssemblyAIAPIKey},
	}

	for _, p := range prompts {
		if err := promptAndSet(p.title, p.value); err != nil {
			return err
		}
	}

	// Write config back to file
	data, err := toml.Marshal(config)
	if err != nil {
		return fmt.Errorf("error marshaling config: %w", err)
	}

	if err := os.WriteFile(configPath, data, 0600); err != nil {
		return fmt.Errorf("error writing config: %w", err)
	}

	fmt.Printf("Wrote to %s\n", configPath)
	return nil
}

func promptAndSet(promptTitle string, currentValue *string) error {
	var value string
	textInput := huh.NewInput().
		Title(promptTitle).
		Prompt("> ").
		Placeholder("press Enter to skip or leave unchanged").
		EchoMode(huh.EchoModePassword).
		Value(&value)

	err := textInput.Run()
	if err != nil && err != huh.ErrUserAborted {
		return err
	}

	value = strings.TrimSpace(value)
	if value != "" {
		*currentValue = value
		fmt.Printf("%s set\n", promptTitle)
	} else {
		fmt.Printf("skipping %s\n", promptTitle)
	}
	return nil
}
