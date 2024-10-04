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
    maxFileSize = 25 * 1024 * 1024 // 25MB in bytes
)

func init() {
    Command.Flags().StringP("path", "p", "", "save transcripts and API responses to path")
    Command.Flags().StringP("suffix", "s", "", "append suffix to filenames for easier recognition")
    Command.Flags().BoolP("verbose", "v", false, "fetch verbose JSON response (includes token and start/end timestamps)")
    Command.Flags().StringP("url", "u", "", "URL of the audio file to transcribe")
}

var Command = &cobra.Command{
    Use:   "assemblyai <audio_file>",
    Short: "Generate transcript of an audio file using Assembly AI's API.",
    Args:  cobra.MaximumNArgs(1),
    RunE: func(cmd *cobra.Command, args []string) error {
        apiKey := viper.GetString("assemblyai_api_key")
        if apiKey == "" {
            return errors.New("Assembly AI's API key not found. Please run 'podscript configure' or set the GROQ_API_KEY environment variable")
        }

        folder, _ := cmd.Flags().GetString("path")
        suffix, _ := cmd.Flags().GetString("suffix")
        audioURL, _ := cmd.Flags().GetString("url")

        if folder != "" {
            folder = filepath.Clean(folder)
            fi, err := os.Stat(folder)
            if err != nil || !fi.IsDir() {
                return fmt.Errorf("path not found: %s", folder)
            }
        }
        timestamp := time.Now().Format("2006-01-02-150405")
        var filenameSuffix string
        if suffix == "" {
            filenameSuffix = timestamp
        } else {
            filenameSuffix = fmt.Sprintf("%s_%s", timestamp, suffix)
        }

        client := aai.NewClient(apiKey)
        ctx := context.Background()

        var transcript *aai.Transcript
        var err error

        if audioURL != "" {
            // Validate URL
            parsedURL, err := url.ParseRequestURI(audioURL)
            if err != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
                return fmt.Errorf("invalid URL: %s", audioURL)
            }

            // Handle URL input
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
            fmt.Printf("Generated a transcript text from URL %s\n", audioURL)
        } else {
            // Handle file input
            if len(args) == 0 {
                return errors.New("no audio file provided")
            }

            audioFilePath := filepath.Clean(args[0])
            fi, err := os.Stat(audioFilePath)
            if err != nil || fi.IsDir() {
                return fmt.Errorf("invalid audio file: %s", audioFilePath)
            }

            if fi.Size() > maxFileSize {
                return fmt.Errorf("file size exceeds 25MB")
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
            fmt.Printf("Generated a transcript text from file %s\n", audioFilePath)
        }

        if transcript == nil || transcript.Text == nil {
            return errors.New("transcription failed, transcript is nil")
        }

        transcriptFilename := path.Join(folder, fmt.Sprintf("assemblyai_api_transcript_%s.txt", filenameSuffix))
        transcriptFilename = filepath.Clean(transcriptFilename)
        if err = os.WriteFile(transcriptFilename, []byte(*transcript.Text), 0644); err != nil {
            fmt.Printf("failed to write transcript: %v\n", err)
            return err
        }
        fmt.Printf("Wrote transcript to %s\n", transcriptFilename)
        return nil
    },
}