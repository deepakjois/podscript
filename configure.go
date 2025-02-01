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
	AssemblyAIAPIKey string `toml:"assembly-ai-api-key" json:"assembly_ai_api_key"`
	DeepgramAPIKey   string `toml:"deepgram-api-key" json:"deepgram_api_key"`
	GroqAPIKey       string `toml:"groq-api-key" json:"groq_api_key"`
	AnthropicAPIKey  string `toml:"anthropic-api-key" json:"anthropic_api_key"`
	OpenAIAPIKey     string `toml:"openai-api-key" json:"openai_api_key"`
}

type ConfigureCmd struct{}

const configFileName = ".podscript.toml"

func (c *ConfigureCmd) Run() error {
	config := &Config{}

	// Try to read existing config
	existingConfig, err := ReadConfig()
	if err == nil {
		config = existingConfig
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

	return WriteConfig(config)
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

func ReadConfig() (*Config, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("error getting home directory: %w", err)
	}

	configPath := path.Join(homeDir, configFileName)
	config := &Config{}

	data, err := os.ReadFile(configPath)
	if !os.IsNotExist(err) { // ignore if file doesn't exist
		if err != nil {
			return nil, fmt.Errorf("error reading config file: %w", err)
		}

		if err := toml.Unmarshal(data, config); err != nil {
			return nil, fmt.Errorf("error parsing config file: %w", err)
		}
	}
	return config, nil
}

func WriteConfig(config *Config) error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("error getting home directory: %w", err)
	}

	configPath := path.Join(homeDir, configFileName)
	data, err := toml.Marshal(config)
	if err != nil {
		return fmt.Errorf("error marshaling config: %w", err)
	}

	return os.WriteFile(configPath, data, 0600)
}
