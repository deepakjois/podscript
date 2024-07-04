package configure

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/huh"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var Command = &cobra.Command{
	Use:   "configure",
	Short: "Configure podscript with API keys",
	RunE: func(cmd *cobra.Command, args []string) error {

		// OpenAPI
		var openAIApiKey string
		textInput := huh.NewInput().
			Title("OpenAI API key").
			Prompt("> ").
			Placeholder("press Enter to skip or leave unchanged").
			EchoMode(huh.EchoModePassword).
			Value(&openAIApiKey)
		err := textInput.Run()
		if err != nil && err != huh.ErrUserAborted {
			return err
		}
		openAIApiKey = strings.TrimSpace(openAIApiKey)
		if openAIApiKey != "" {
			viper.Set("openai_api_key", openAIApiKey)
			fmt.Println("OpenAI API key set")
		} else {
			fmt.Println("skipping OpenAI API key")
		}

		// Deepgram
		var deepgramApiKey string
		textInput = huh.NewInput().
			Title("Deepgram API key").
			Prompt("> ").
			Placeholder("press Enter to skip or leave unchanged").
			EchoMode(huh.EchoModePassword).
			Value(&deepgramApiKey)
		err = textInput.Run()
		if err != nil && err != huh.ErrUserAborted {
			return err
		}
		deepgramApiKey = strings.TrimSpace(deepgramApiKey)
		if deepgramApiKey != "" {
			viper.Set("deepgram_api_key", deepgramApiKey)
			fmt.Println("Deepgram API Key set")
		} else {
			fmt.Println("skipping Deepgram API key")
		}
		err = viper.WriteConfigAs(viper.ConfigFileUsed())
		if err != nil {
			return fmt.Errorf("error writing config: %v", err)
		} else {
			fmt.Printf("Wrote to %s\n", viper.ConfigFileUsed())
		}
		return nil
	},
}
