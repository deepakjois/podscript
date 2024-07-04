package deepgram

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"net/url"
	"os"
	"path"
	"time"

	prerecorded "github.com/deepgram/deepgram-go-sdk/pkg/api/prerecorded/v1"
	api "github.com/deepgram/deepgram-go-sdk/pkg/api/prerecorded/v1/interfaces"
	interfaces "github.com/deepgram/deepgram-go-sdk/pkg/client/interfaces"
	client "github.com/deepgram/deepgram-go-sdk/pkg/client/prerecorded"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

func init() {
	Command.Flags().String("path", "", "save transcripts and API responses to path")
	Command.Flags().String("suffix", "", "append suffix to filenames")
	Command.Flags().Bool("file", false, "transcribe local audio file. mutually exclusive with --url")
	Command.Flags().Bool("url", false, "transcribe audio file located remotely. mutually exclusive with --file")
	Command.MarkFlagsMutuallyExclusive("file", "url")
}

var Command = &cobra.Command{
	Use:   "deepgram <audio_file | audio_url>",
	Short: "Generate transcript of an audio file.",
	Args:  cobra.ExactArgs(1),
	PreRunE: func(cmd *cobra.Command, args []string) error {
		useFile, _ := cmd.Flags().GetBool("file")
		useURL, _ := cmd.Flags().GetBool("url")

		if !(useFile || useURL) {
			return errors.New("one of --file or --url must be specified")
		}
		return nil
	},
	RunE: func(cmd *cobra.Command, args []string) error {
		apiKey := viper.GetString("deepgram_api_key")
		if apiKey == "" {
			return errors.New("Deepgram API key not found. Please run 'podscript configure' or set the PODSCRIPT_DEEPGRAM_API_KEY environment variable.")
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
		client.InitWithDefault()

		ctx := context.Background()

		options := &interfaces.PreRecordedTranscriptionOptions{
			Model:       "nova-2",
			SmartFormat: true,
			Punctuate:   true,
			Diarize:     true,
			Utterances:  true,
		}

		c := client.New(apiKey, &interfaces.ClientOptions{})
		dg := prerecorded.New(c)

		useFile, _ := cmd.Flags().GetBool("file")
		useURL, _ := cmd.Flags().GetBool("url")

		if (useFile && useURL) || (!useFile && !useURL) {
			// Should not happen
			return errors.New("only one of --file or --url must be specified")
		}

		var (
			res *api.PreRecordedResponse
			err error
		)
		if useFile {
			var fi fs.FileInfo
			fi, err = os.Stat(args[0])
			if err != nil || fi.IsDir() {
				return fmt.Errorf("invalid file path or URL: %s", args[0])
			}
			res, err = dg.FromFile(ctx, args[0], options)
		} else {
			_, err = url.Parse(args[0])
			if err != nil {
				return fmt.Errorf("could not parse URL %s: %w", args[0], err)
			}
			res, err = dg.FromURL(ctx, args[0], options)
		}

		if err != nil {
			return err
		}

		data, err := json.Marshal(res)
		if err != nil {
			fmt.Printf("json.Marshal failed. Err: %v\n", err)
			os.Exit(1)
		}

		jsonFilename := path.Join(folder, fmt.Sprintf("deepgram_api_response_%s.json", filenameSuffix))
		if err = os.WriteFile(jsonFilename, data, 0644); err != nil {
			return fmt.Errorf("failed to write JSON response: %w", err)
		}
		return nil
	},
}
