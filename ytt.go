package main

import (
	"context"
	"fmt"
	"os"
	"regexp"
	"strings"

	"github.com/deepakjois/ytt"
)

type YTTCmd struct {
	OpenAIAPIKey    string   `name:"openai-api-key" help:"OpenAI API key" env:"OPENAI_API_KEY" hidden:""`
	AnthropicAPIKey string   `help:"Anthropic API key" env:"ANTHROPIC_API_KEY" hidden:""`
	GroqAPIKey      string   `help:"Groq API key" env:"GROQ_API_KEY" hidden:""`
	Model           LLMModel `help:"Model to use" default:"gpt-4o" short:"m"`
	VideoURL        string   `arg:"" help:"YouTube video URL" short:"u"`
	Output          string   `help:"Path to output transcript file (default: stdout)" short:"o"`
}

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

var transcriptRegex = regexp.MustCompile(`(?s)<transcript>(.*?)</transcript>`)

func extractTranscript(input string) string {
	match := transcriptRegex.FindStringSubmatch(input)
	if len(match) > 1 {
		return strings.TrimSpace(match[1])
	}
	return ""
}

func (cmd *YTTCmd) getLLMClient() (LLMClient, error) {
	var provider LLMProvider
	var apiKey string

	switch cmd.Model {
	case GPT4o, GPT4oMini:
		if cmd.OpenAIAPIKey == "" {
			return nil, fmt.Errorf("OpenAI API key required for model %s", cmd.Model)
		}
		provider = OpenAI
		apiKey = cmd.OpenAIAPIKey
	case Claude35Sonnet, Claude35Haiku:
		if cmd.AnthropicAPIKey == "" {
			return nil, fmt.Errorf("Anthropic API key required for model %s", cmd.Model)
		}
		provider = Claude
		apiKey = cmd.AnthropicAPIKey
	case Llama3370b, Llama318b:
		if cmd.GroqAPIKey == "" {
			return nil, fmt.Errorf("Groq API key required for model %s", cmd.Model)
		}
		provider = Groq
		apiKey = cmd.GroqAPIKey
	default:
		return nil, fmt.Errorf("unsupported model: %s", cmd.Model)
	}

	return NewLLMClient(provider, apiKey)
}

// Approximate words from token count (typically 0.75 tokens per word)
func calcWordsFromTokens(tokens int) int {
	return int(float64(tokens) * 0.75)
}

// Split text into chunks that fit within token limits
func (cmd *YTTCmd) splitText(text string) []string {
	maxWords := calcWordsFromTokens(modelTokenLimits[cmd.Model])
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

	// Add remaining words if any
	if currentChunk.Len() > 0 {
		chunks = append(chunks, currentChunk.String())
	}

	return chunks
}

func (cmd *YTTCmd) Run() error {
	client, err := cmd.getLLMClient()
	if err != nil {
		return err
	}

	// Extract Transcript
	videoID, err := ytt.ExtractVideoID(cmd.VideoURL)
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

	// TODO add option to store raw transcript in a file

	// Split text into chunks if needed
	chunks := cmd.splitText(transcriptTxt.String())

	// Set output writer
	out := os.Stdout
	if cmd.Output != "" {
		var err error
		f, err := os.Create(cmd.Output)
		if err != nil {
			return fmt.Errorf("failed to create output file: %w", err)
		}
		defer f.Close()
		out = f
	}

	// Process each chunk
	for _, chunk := range chunks {
		respCh, errCh := client.CompleteStream(context.Background(), CompletionRequest{
			UserPrompt: fmt.Sprintf(userPrompt, chunk),
			Model:      cmd.Model,
		})

		for resp := range respCh {
			if resp.Done {
				break
			}

			text := resp.Text
			fmt.Fprint(out, text)
		}

		if err := <-errCh; err != nil {
			return fmt.Errorf("error from LLM: %w", err)
		}
	}

	return nil
}
