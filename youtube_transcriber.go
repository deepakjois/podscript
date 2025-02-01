package main

import (
	"context"
	"fmt"
	"strings"

	"github.com/deepakjois/ytt"
)

const (
	userPrompt = `You will be given auto-generated captions from a YouTube video. These may be full captions, or a segment of the full transcript if it is too large. Your task is to transform these captions into a clean, readable transcript. Here are the auto-generated captions:

<captions>
%s
</captions>

Follow these steps to create a clean transcript:

1. Correct any spelling errors you encounter. Use your knowledge of common words and context to determine the correct spelling.

2. Add appropriate punctuation throughout the text. This includes commas, periods, question marks, and exclamation points where necessary.

3. Capitalize the first letter of each sentence and proper nouns.

4. Break the text into logical paragraphs. Start a new paragraph when there's a shift in topic or speaker.

5. Remove any unnecessary filler words, repetitions, or false starts.

6. Maintain the original meaning and intent of the transcript. Do not remove any content even if it is unrelated to the main topic.


Once you have completed these steps, provide the clean transcript . Ensure that the transcript is well-formatted, easy to read, and accurately represents the original content of the video. Do not include any additional text in your response.`
)

type TranscriptionCallback func(text string, done bool) error

type YouTubeTranscriber struct {
	client LLMClient
	model  LLMModel
}

func NewYouTubeTranscriber(client LLMClient, model LLMModel) *YouTubeTranscriber {
	return &YouTubeTranscriber{
		client: client,
		model:  model,
	}
}

func (yt *YouTubeTranscriber) Transcribe(ctx context.Context, videoURL string, callback TranscriptionCallback) error {
	videoID, err := ytt.ExtractVideoID(videoURL)
	if err != nil {
		return fmt.Errorf("failed to extract video ID: %w", err)
	}

	transcriptList, err := ytt.ListTranscripts(videoID)
	if err != nil {
		return fmt.Errorf("failed to list transcripts: %w", err)
	}

	transcript, err := transcriptList.FindTranscript("en")
	if err != nil {
		return fmt.Errorf("failed to find English transcript: %w", err)
	}

	entries, err := transcript.Fetch()
	if err != nil {
		return fmt.Errorf("failed to fetch transcript: %w", err)
	}

	var transcriptTxt strings.Builder
	for i, entry := range entries {
		if i > 0 {
			transcriptTxt.WriteString(" ")
		}
		transcriptTxt.WriteString(entry.Text)
	}

	chunks := yt.splitText(transcriptTxt.String())

	for _, chunk := range chunks {
		respCh, errCh := yt.client.CompleteStream(ctx, CompletionRequest{
			UserPrompt: fmt.Sprintf(userPrompt, chunk),
			Model:      yt.model,
		})

		for resp := range respCh {
			if err := callback(resp.Text, resp.Done); err != nil {
				return fmt.Errorf("callback error: %w", err)
			}
		}

		if err := <-errCh; err != nil {
			return fmt.Errorf("error from LLM: %w", err)
		}
	}

	return nil
}

// Approximate words from token count (typically 0.75 tokens per word)
func calcWordsFromTokens(tokens int) int {
	return int(float64(tokens) * 0.75)
}

func (yt *YouTubeTranscriber) splitText(text string) []string {
	maxWords := calcWordsFromTokens(modelTokenLimits[yt.model])
	words := strings.Fields(text)

	var chunks []string
	var currentChunk strings.Builder
	currentWordCount := 0

	for i, word := range words {
		if i > 0 {
			currentChunk.WriteString(" ")
		}
		currentChunk.WriteString(word)
		currentWordCount++

		if currentWordCount >= maxWords {
			chunks = append(chunks, currentChunk.String())
			currentChunk.Reset()
			currentWordCount = 0
		}
	}

	if currentChunk.Len() > 0 {
		chunks = append(chunks, currentChunk.String())
	}

	return chunks
}
