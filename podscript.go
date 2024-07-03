package main

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	"github.com/cenkalti/backoff/v4"
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/kkdai/youtube/v2"
	"github.com/sashabaranov/go-openai"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var rootCmd = &cobra.Command{
	Use:   "podscript",
	Short: "podscript - generate podcast transcripts",
}

var configureCmd = &cobra.Command{
	Use:   "configure",
	Short: "Configure podscript with API keys",
	Run: func(cmd *cobra.Command, args []string) {
		p := tea.NewProgram(initialModel())
		if _, err := p.Run(); err != nil {
			fmt.Printf("Error running program: %v", err)
			os.Exit(1)
		}
	},
}

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

	fmt.Printf("Usage: %v\n", resp.Usage)
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

var yttCmd = &cobra.Command{
	Use:   "ytt <youtube_url>",
	Short: "Run ytt command",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		apiKey := viper.GetString("openai_api_key")
		if apiKey == "" {
			fmt.Println("Error: OpenAI API key not found. Please run 'podscript configure' or set the PODSCRIPT_OPENAI_API_KEY environment variable.")
			os.Exit(1)
		}
		fmt.Printf("Using API Key: %s\n", apiKey)
		// Implement ytt functionality here
		// Extract Transcript
		youtubeClient := youtube.Client{}

		video, err := youtubeClient.GetVideo(args[0])
		if err != nil {
			log.Fatalf("Failed to get video info: %v", err)
		}

		for _, caption := range video.CaptionTracks {
			fmt.Printf("%v\n\n", caption)
		}

		transcript, err := youtubeClient.GetTranscript(video, "en")
		if err != nil {
			log.Fatalf("Failed to get transcript info: %v", err)
		}

		var transcriptTxt string
		for _, tr := range transcript {
			transcriptTxt += tr.Text + "\n"
		}

		timestamp := time.Now().Format("2006-01-02-150405")
		if err = os.WriteFile(fmt.Sprintf("raw_transcript_%s.txt", timestamp), []byte(transcriptTxt), 0644); err != nil {
			log.Fatalf("Failed to write raw transcript: %v", err)
		}

		// // Chunk and Send to OpenAI
		chunks := chunkTranscript(transcriptTxt)
		contextTxt := chunks[0]
		openAPIclient := openai.NewClient(apiKey)

		var cleanedTranscript strings.Builder
		for i, chunk := range chunks {
			cleanedChunk, err := callChatGPTAPIWithBackoff(openAPIclient, contextTxt, chunk)
			if err != nil {
				log.Fatalf("Failed to process chunk: %v", err)
			}
			fmt.Printf("CLEANED CHUNK %d (%d words):\n\n", i, countWords(cleanedChunk))
			cleanedTranscript.WriteString(cleanedChunk + " ")
		}

		// fmt.Println(cleanedTranscript.String())
		// cleanedTranscript, err := callChatGPTAPI(openAPIclient, transcriptTxt)
		if err != nil {
			log.Fatalf("Failed to process chunk: %v", err)
		}
		if err = os.WriteFile(fmt.Sprintf("cleaned_transcript_%s.txt", timestamp), []byte(cleanedTranscript.String()), 0644); err != nil {
			log.Fatalf("Failed to write cleaned transcript: %v", err)
		}
	},
}

func init() {
	rootCmd.AddCommand(configureCmd)

	yttCmd.Flags().String("path", "", "save raw and cleaned up transcripts to path")
	yttCmd.Flags().String("suffix", "", "append suffix to filenames")
	rootCmd.AddCommand(yttCmd)
	rootCmd.CompletionOptions.DisableDefaultCmd = true

	homeDir, err := os.UserHomeDir()
	if err != nil {
		fmt.Println("Error getting home directory:", err)
		os.Exit(1)
	}

	viper.SetConfigType("toml")
	viper.SetConfigFile(path.Join(homeDir, ".podscript.toml"))

	viper.SetEnvPrefix("PODSCRIPT")
	viper.AutomaticEnv()

	// Map the config key to the environment variable
	// viper.BindEnv("openai_api_key", "OPENAI_API_KEY")

	// Read in config file and ENV variables if set
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			// Config file was found but another error was produced
			fmt.Printf("Error reading config file: %s\n", err)
		}
	}
}

type model struct {
	textInput textinput.Model
	err       error
}

func initialModel() model {
	ti := textinput.New()
	ti.Placeholder = "Enter your OpenAI API Key"
	ti.Focus()

	return model{
		textInput: ti,
		err:       nil,
	}
}

func (m model) Init() tea.Cmd {
	return textinput.Blink
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.Type {
		case tea.KeyEnter:

			viper.Set("openai_api_key", m.textInput.Value())
			err := viper.WriteConfigAs(viper.ConfigFileUsed())
			if err != nil {
				m.err = fmt.Errorf("error writing config: %v", err)
			}
			return m, tea.Quit
		case tea.KeyCtrlC, tea.KeyEsc:
			return m, tea.Quit
		}

	case error:
		m.err = msg
		return m, nil
	}

	m.textInput, cmd = m.textInput.Update(msg)
	return m, cmd
}

func (m model) View() string {
	if m.err != nil {
		return fmt.Sprintf("Error: %v\n", m.err)
	}

	style := lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("#FAFAFA")).
		Background(lipgloss.Color("#7D56F4")).
		PaddingTop(1).
		PaddingBottom(1).
		PaddingLeft(4).
		PaddingRight(4)

	return style.Render("Enter your OpenAI API Key:") + "\n\n" +
		m.textInput.View() + "\n\n" +
		"(press enter to submit)"
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
