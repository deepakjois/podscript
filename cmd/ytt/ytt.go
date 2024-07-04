package ytt

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/kkdai/youtube/v2"
	"github.com/sashabaranov/go-openai"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

const prompt = "Clean up the following podcast transcription snippet and generate a clean version. Do not remove anything and stay as close as possible to the original text. Only include the cleaned up transcript."
const maxWordsPerChunk = 3000

func countWords(s string) int {
	return len(strings.Fields(s))
}

func callChatGPTAPIWithBackoff(client *openai.Client, contextTxt, text string) (string, error) {

	req := openai.ChatCompletionRequest{
		Model: openai.GPT4o,
		Messages: []openai.ChatCompletionMessage{
			{
				Role:    openai.ChatMessageRoleSystem,
				Content: "You are a top tier podcast transcriptionist skilled in grammer, spelling and punctuation. You specialize in taking rough transcripts and cleaning and formatting them with full accuracy. Use the following transcript from the beginning for context\n\n" + contextTxt,
			},
			{
				Role:    openai.ChatMessageRoleUser,
				Content: prompt + "\n\n" + text,
			},
		},
	}

	backOff := backoff.NewExponentialBackOff()
	backOff.MaxElapsedTime = 10 * time.Minute

	var resp openai.ChatCompletionResponse

	err := backoff.Retry(func() (err error) {
		resp, err = client.CreateChatCompletion(context.Background(), req)
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

	fmt.Printf("Usage: %+v\n", resp.Usage)
	return resp.Choices[0].Message.Content, nil
}

func chunkTranscript(transcript string) []string {
	// Split the transcript into chunks
	var chunks []string
	scanner := bufio.NewScanner(strings.NewReader(transcript))
	scanner.Split(bufio.ScanWords)

	var chunkBuilder strings.Builder
	wordCount := 0

	for scanner.Scan() {
		word := scanner.Text()
		chunkBuilder.WriteString(word + " ")
		wordCount++
		if wordCount >= maxWordsPerChunk {
			chunks = append(chunks, chunkBuilder.String())
			chunkBuilder.Reset()
			wordCount = 0
		}
	}
	if chunkBuilder.Len() > 0 {
		chunks = append(chunks, chunkBuilder.String())
	}
	return chunks

}

var Command = &cobra.Command{
	Use:   "ytt <youtube_url>",
	Short: "Run ytt command",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		apiKey := viper.GetString("openai_api_key")
		if apiKey == "" {
			return errors.New("OpenAI API key not found. Please run 'podscript configure' or set the PODSCRIPT_OPENAI_API_KEY environment variable.")
		}

		folder, _ := cmd.Flags().GetString("path")
		suffix, _ := cmd.Flags().GetString("suffix")
		if folder != "" {
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

		// Extract Transcript
		youtubeClient := youtube.Client{}

		video, err := youtubeClient.GetVideo(args[0])
		if err != nil {
			return fmt.Errorf("failed to get video info: %w", err)
		}

		for _, caption := range video.CaptionTracks {
			fmt.Printf("%v\n\n", caption)
		}

		transcript, err := youtubeClient.GetTranscript(video, "en")
		if err != nil {
			return fmt.Errorf("failed to get transcript info: %w", err)
		}

		var transcriptTxt string
		for _, tr := range transcript {
			transcriptTxt += tr.Text + "\n"
		}

		rawTranscriptFilename := path.Join(folder, fmt.Sprintf("raw_transcript_%s.txt", filenameSuffix))
		if err = os.WriteFile(rawTranscriptFilename, []byte(transcriptTxt), 0644); err != nil {
			return fmt.Errorf("failed to write raw transcript: %w", err)
		}

		// Chunk and Send to OpenAI
		chunks := chunkTranscript(transcriptTxt)
		contextTxt := chunks[0]
		openAPIclient := openai.NewClient(apiKey)

		var cleanedTranscript strings.Builder
		for i, chunk := range chunks {
			cleanedChunk, err := callChatGPTAPIWithBackoff(openAPIclient, contextTxt, chunk)
			if err != nil {
				return fmt.Errorf("failed to process chunk: %w", err)
			}
			fmt.Printf("CLEANED CHUNK %d (%d words):\n\n", i, countWords(cleanedChunk))
			cleanedTranscript.WriteString(cleanedChunk + " ")
		}

		if err != nil {
			return fmt.Errorf("failed to process chunk: %w", err)
		}

		cleanedTranscriptFilename := path.Join(folder, fmt.Sprintf("cleaned_transcript_%s.txt", filenameSuffix))
		if err = os.WriteFile(cleanedTranscriptFilename, []byte(cleanedTranscript.String()), 0644); err != nil {
			return fmt.Errorf("failed to write cleaned transcript: %w", err)
		}
		return nil
	},
}

func init() {
	Command.Flags().String("path", "", "save raw and cleaned up transcripts to path")
	Command.Flags().String("suffix", "", "append suffix to filenames")
}
