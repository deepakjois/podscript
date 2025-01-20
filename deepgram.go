package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"

	prerecorded "github.com/deepgram/deepgram-go-sdk/pkg/api/prerecorded/v1"
	api "github.com/deepgram/deepgram-go-sdk/pkg/api/prerecorded/v1/interfaces"
	interfaces "github.com/deepgram/deepgram-go-sdk/pkg/client/interfaces"
	client "github.com/deepgram/deepgram-go-sdk/pkg/client/prerecorded"
)

type DeepgramCmd struct {
	FromURL    string `help:"URL of the audio file to transcribe" short:"u" xor:"source" required:""`
	FromFile   string `help:"Local path to the audio file to transcribe" short:"f" xor:"source" required:""`
	Output     string `help:"Path to output transcript file (default: stdout)" short:"o"`
	JSONOutput string `help:"Path to save raw API response as JSON" short:"j"`
	APIKey     string `env:"DEEPGRAM_API_KEY" default:"" hidden:""`
	Model      string `help:"Speech model to use for transcription (default: nova-2)" default:"nova-2" short:"m"`
}

func (d *DeepgramCmd) Run() error {
	if d.APIKey == "" {
		return errors.New("API key not found. Please run 'podscript configure' or set the DEEPGRAM_API_KEY environment variable")
	}

	if d.FromURL == "" && d.FromFile == "" {
		return errors.New("please provide either a valid URL or a file path")
	}

	client.InitWithDefault()
	ctx := context.Background()

	options := &interfaces.PreRecordedTranscriptionOptions{
		Model:       d.Model,
		SmartFormat: true,
		Punctuate:   true,
		Diarize:     true,
		Utterances:  true,
	}

	c := client.New(d.APIKey, &interfaces.ClientOptions{})
	dg := prerecorded.New(c)

	var (
		res *api.PreRecordedResponse
		err error
	)

	if d.FromFile != "" {
		var fi fs.FileInfo
		fi, err = os.Stat(d.FromFile)
		if err != nil || fi.IsDir() {
			return fmt.Errorf("invalid file path: %s", d.FromFile)
		}
		res, err = dg.FromFile(ctx, d.FromFile, options)
	} else {
		if !client.IsURL(d.FromURL) {
			return fmt.Errorf("invalid URL: %s", d.FromURL)
		}
		res, err = dg.FromURL(ctx, d.FromURL, options)
	}

	if err != nil {
		return err
	}

	if d.JSONOutput != "" {
		data, err := json.Marshal(res)
		if err != nil {
			return fmt.Errorf("json.Marshal failed: %w", err)
		}
		if err = os.WriteFile(d.JSONOutput, data, 0644); err != nil {
			return fmt.Errorf("failed to write JSON response: %w", err)
		}
	}

	transcript := res.Results.Channels[0].Alternatives[0].Paragraphs.Transcript
	if d.Output != "" {
		if err = os.WriteFile(d.Output, []byte(transcript), 0644); err != nil {
			return fmt.Errorf("failed to write transcript: %w", err)
		}
	} else {
		fmt.Println(transcript)
	}

	return nil
}
