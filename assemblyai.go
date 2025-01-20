package main

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"

	aai "github.com/AssemblyAI/assemblyai-go-sdk"
)

const (
	maxLocalFileSize int64 = 2200 * 1024 * 1024 // Approximate 2.2GB in bytes
)

type AssemblyAICmd struct {
	Model    string `help:"Speech model to use for transcription (best, nano)" enum:"best,nano" default:"best" short:"m"`
	FromURL  string `help:"URL of the audio file to transcribe" short:"u" xor:"source" required:""`
	FromFile string `help:"Local path to the audio file to transcribe" short:"f" xor:"source" required:""`
	Output   string `help:"Path to output transcript file (default: stdout)" short:"o"`
	APIKey   string `env:"ASSEMBLYAI_API_KEY" default:"" hidden:""`
}

func (a *AssemblyAICmd) Run() error {
	if a.APIKey == "" {
		return errors.New("API key not found. Please run 'podscript configure' or set the ASSEMBLYAI_API_KEY environment variable")
	}

	client := aai.NewClient(a.APIKey)
	ctx := context.Background()

	var transcript *aai.Transcript

	params := &aai.TranscriptOptionalParams{
		SpeakerLabels: aai.Bool(true),
		Punctuate:     aai.Bool(true),
		FormatText:    aai.Bool(true),
		SpeechModel:   aai.SpeechModel(a.Model),
	}

	if a.FromURL != "" {
		parsedURL, err := url.ParseRequestURI(a.FromURL)
		if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
			return fmt.Errorf("invalid URL: %s", a.FromURL)
		}

		transcriptValue, err := client.Transcripts.TranscribeFromURL(ctx, a.FromURL, params)
		if err != nil {
			return fmt.Errorf("failed to transcribe from URL: %w", err)
		}
		transcript = &transcriptValue
	} else if a.FromFile != "" {
		audioFilePath := filepath.Clean(a.FromFile)
		fi, err := os.Stat(audioFilePath)
		if err != nil || fi.IsDir() {
			return fmt.Errorf("invalid audio file: %s", audioFilePath)
		}

		if fi.Size() > maxLocalFileSize {
			return fmt.Errorf("file size exceeds 2.2GB limit")
		}

		file, err := os.Open(audioFilePath)
		if err != nil {
			return fmt.Errorf("error opening file: %w", err)
		}
		defer file.Close()

		transcriptValue, err := client.Transcripts.TranscribeFromReader(ctx, file, nil)
		if err != nil {
			return fmt.Errorf("failed to transcribe from file: %w", err)
		}
		transcript = &transcriptValue
	} else {
		return errors.New("please provide either a valid URL or a file path")
	}

	if transcript == nil || transcript.Text == nil {
		return errors.New("transcription failed: received nil transcript from AssemblyAI API")
	}

	var output *os.File = os.Stdout
	if a.Output != "" {
		var err error
		output, err = os.Create(a.Output)
		if err != nil {
			return fmt.Errorf("failed to create output file: %w", err)
		}
		defer output.Close()
	}

	for _, utterance := range transcript.Utterances {
		_, err := fmt.Fprintf(output, "Speaker %s: %s\n\n",
			aai.ToString(utterance.Speaker),
			aai.ToString(utterance.Text),
		)
		if err != nil {
			return fmt.Errorf("failed to write utterance to file: %w", err)
		}
	}

	return nil
}
