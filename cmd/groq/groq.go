package groq

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"time"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

const (
	apiURL      = "https://api.groq.com/openai/v1/audio/translations"
	maxFileSize = 25 * 1024 * 1024 // 25MB in bytes
)

func init() {
	Command.Flags().StringP("path", "p", "", "save transcripts and API responses to path")
	Command.Flags().StringP("suffix", "s", "", "append suffix to filenames for easier recognition")
	Command.Flags().BoolP("verbose", "v", false, "fetch verbose JSON response (includes token and start/end timestamps)")
}

type WhisperRequest struct {
	FilePath       string
	Model          string
	Prompt         string
	Temperature    float64
	ResponseFormat string
	APIKey         string
}

type WhisperResponse struct {
	Text string `json:"text"`
}

func makeWhisperAPICall(req WhisperRequest) ([]byte, error) {
	// Create a buffer to store the multipart form data
	var requestBody bytes.Buffer
	writer := multipart.NewWriter(&requestBody)

	// Add the file to the form
	file, err := os.Open(req.FilePath)
	if err != nil {
		return nil, fmt.Errorf("error opening file: %w", err)
	}
	defer file.Close()

	part, err := writer.CreateFormFile("file", filepath.Base(req.FilePath))
	if err != nil {
		return nil, fmt.Errorf("error creating form file: %w", err)
	}
	_, err = io.Copy(part, file)
	if err != nil {
		return nil, fmt.Errorf("error copying file content: %w", err)
	}

	// Add other form fields
	writer.WriteField("model", req.Model)
	writer.WriteField("prompt", req.Prompt)
	writer.WriteField("temperature", fmt.Sprintf("%f", req.Temperature))
	writer.WriteField("response_format", req.ResponseFormat)

	// Close the multipart writer
	err = writer.Close()
	if err != nil {
		return nil, fmt.Errorf("error closing multipart writer: %w", err)
	}

	// Create the HTTP request
	httpReq, err := http.NewRequest("POST", apiURL, &requestBody)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Authorization", "Bearer "+req.APIKey)
	httpReq.Header.Set("Content-Type", writer.FormDataContentType())

	// Make the request
	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	// Read the response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status code %d: %s", resp.StatusCode, string(body))
	}

	return body, nil
}

var Command = &cobra.Command{
	Use:   "groq <audio_file>",
	Short: "Generate transcript of an audio file using Groq's Whisper API.",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		apiKey := viper.GetString("groq_api_key")
		if apiKey == "" {
			return errors.New("Groq API key not found. Please run 'podscript configure' or set the GROQ_API_KEY environment variable")
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

		fi, err := os.Stat(args[0])
		if err != nil || fi.IsDir() {
			return fmt.Errorf("invalid audio file: %s", folder)
		}

		if fi.Size() > maxFileSize {
			return fmt.Errorf("file size exceeds 25MB")
		}

		var format string
		if verbose, _ := cmd.Flags().GetBool("verbose"); verbose {
			format = "verbose_json"
		} else {
			format = "json"
		}
		request := WhisperRequest{
			FilePath:       args[0],
			Model:          "whisper-large-v3",
			Prompt:         "",
			Temperature:    0,
			ResponseFormat: format,
			APIKey:         apiKey,
		}

		data, err := makeWhisperAPICall(request)
		if err != nil {
			return err
		}

		jsonFilename := path.Join(folder, fmt.Sprintf("groq_whisper_api_response_%s.json", filenameSuffix))
		if err = os.WriteFile(jsonFilename, data, 0644); err != nil {
			return fmt.Errorf("failed to write JSON response: %w", err)
		}
		fmt.Printf("wrote raw JSON API response to %s\n", jsonFilename)

		var whisperResp WhisperResponse
		if err := json.Unmarshal(data, &whisperResp); err != nil {
			return fmt.Errorf("json parsing failed: %w", err)
		}

		transcriptFilename := path.Join(folder, fmt.Sprintf("groq_whisper_api_transcript_%s.txt", filenameSuffix))
		if err = os.WriteFile(transcriptFilename, []byte(whisperResp.Text), 0644); err != nil {
			return fmt.Errorf("failed to write transcript: %w", err)
		}
		fmt.Printf("wrote transcript to %s\n", transcriptFilename)
		return nil
	},
}
