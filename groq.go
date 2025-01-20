package main

import (
	"errors"
	"fmt"
	"os"

	"github.com/deepakjois/groq"
)

type GroqCmd struct {
	File   string `arg:"" help:"Audio file to transcribe"`
	Output string `help:"Path to output transcript file (default: stdout)" short:"o"`
	APIKey string `env:"GROQ_API_KEY" default:"" hidden:""`
}

func (g *GroqCmd) Run() error {
	if g.APIKey == "" {
		return errors.New("API key not found. Please run 'podscript configure' or set the GROQ_API_KEY environment variable")
	}

	file, err := os.Open(g.File)
	if err != nil {
		return fmt.Errorf("error opening file: %w", err)
	}
	defer file.Close()

	client := groq.NewClient(groq.WithAPIKey(g.APIKey))

	response, err := client.CreateTranscription(groq.TranscriptionCreateParams{
		File:  file,
		Model: "whisper-large-v3",
	})
	if err != nil {
		return fmt.Errorf("transcription failed: %w", err)
	}

	if g.Output != "" {
		if err = os.WriteFile(g.Output, []byte(response.Text), 0644); err != nil {
			return fmt.Errorf("failed to write transcript: %w", err)
		}
	} else {
		fmt.Println(response.Text)
	}

	return nil
}
