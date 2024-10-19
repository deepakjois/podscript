package assemblyai

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"time"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"

	aai "github.com/AssemblyAI/assemblyai-go-sdk"
)

const (
	maxLocalFileSize int64 = 2200 * 1024 * 1024 // Approximate 2.2GB in bytes
)

func init() {
	Command.Flags().StringP("path", "p", "", "save transcripts and API responses to path")
	Command.Flags().StringP("suffix", "s", "", "append suffix to filenames for easier recognition")
	Command.Flags().BoolP("verbose", "v", false, "fetch verbose JSON response (includes token and start/end timestamps)")
	Command.Flags().StringP("from-url", "u", "", "URL of the audio file to transcribe")
	Command.Flags().StringP("from-file", "f", "", "Local path to the audio file to transcribe")
}

var Command = &cobra.Command{
	Use:   "assemblyai",
	Short: "Generate transcript of an audio file using Assembly AI's API.",
	RunE: func(cmd *cobra.Command, args []string) error {
		apiKey := viper.GetString("assemblyai_api_key")
		if apiKey == "" {
			return errors.New("assembly AI's API key not found. Please run 'podscript configure' or set the ASSEMBLYAI_API_KEY environment variable")
		}

		folder, _ := cmd.Flags().GetString("path")
		suffix, _ := cmd.Flags().GetString("suffix")
		audioURL, _ := cmd.Flags().GetString("from-url")
		audioFilePath, _ := cmd.Flags().GetString("from-file")
		verbose, _ := cmd.Flags().GetBool("verbose")

		if folder == "" {
			folder = "." // Default to current directory if no path is specified
		}

		folder = filepath.Clean(folder)
		if fi, err := os.Stat(folder); err != nil || !fi.IsDir() {
			return fmt.Errorf("path not found: %s", folder)
		}

		timestamp := time.Now().Format("2006-01-02-150405")
		filenameSuffix := timestamp
		if suffix != "" {
			filenameSuffix = fmt.Sprintf("%s_%s", timestamp, suffix)
		}

		client := aai.NewClient(apiKey)
		ctx := context.Background()

		var transcript *aai.Transcript
		var err error

		if audioURL != "" {
			// Handle URL input
			parsedURL, err := url.ParseRequestURI(audioURL)
			if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
				return fmt.Errorf("invalid URL: %s", audioURL)
			}

			params := &aai.TranscriptOptionalParams{
				SpeakerLabels: aai.Bool(true),
				Punctuate:     aai.Bool(true),
				FormatText:    aai.Bool(true),
			}
			transcriptValue, err := client.Transcripts.TranscribeFromURL(ctx, audioURL, params)
			if err != nil {
				return fmt.Errorf("failed to transcribe from URL: %w", err)
			}
			transcript = &transcriptValue
			fmt.Printf("Generated transcript from URL %s\n", audioURL)

		} else if audioFilePath != "" {
			// Handle file input
			audioFilePath := filepath.Clean(audioFilePath)
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
			fmt.Printf("Generated transcript from file %s\n", audioFilePath)
		} else {
			return errors.New("please provide either a valid URL or a file path")
		}

		if transcript == nil || transcript.Text == nil {
			return errors.New("transcription failed: received nil transcript from AssemblyAI API")
		}

		transcriptFilename := path.Join(folder, fmt.Sprintf("assemblyai_transcript_%s.txt", filenameSuffix))
		transcriptFilename = filepath.Clean(transcriptFilename)
		file, err := os.Create(transcriptFilename)
		if err != nil {
			return fmt.Errorf("failed to create transcript file: %w", err)
		}
		defer file.Close()

		for _, utterance := range transcript.Utterances {
			_, err := fmt.Fprintf(file, "Speaker %s: %s\n\n",
				aai.ToString(utterance.Speaker),
				aai.ToString(utterance.Text),
			)
			if err != nil {
				return fmt.Errorf("failed to write utterance to file: %w", err)
			}
		}
		fmt.Printf("Wrote transcript to %s\n", transcriptFilename)

		if verbose {
			fmt.Printf("Transcript metadata: %+v\n", transcript)
		}

		return nil
	},
}
