package configure

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/huh"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

func setViperKeyFromPrompt(promptTitle string, viperKey string) error {
	var value string
	textInput := huh.NewInput().
		Title(promptTitle).
		Prompt("> ").
		Placeholder("press Enter to skip or leave unchanged").
		EchoMode(huh.EchoModePassword).
		Value(&value)
	err := textInput.Run()
	if err != nil && err != huh.ErrUserAborted {
		return err
	}
	value = strings.TrimSpace(value)
	if value != "" {
		viper.Set(viperKey, value)
		fmt.Printf("%s set\n", promptTitle)
	} else {
		fmt.Printf("skipping %s\n", promptTitle)
	}
	return nil
}

var Command = &cobra.Command{
	Use:   "configure",
	Short: "Configure podscript with API keys",
	RunE: func(cmd *cobra.Command, args []string) error {

		// OpenAPI
		if err := setViperKeyFromPrompt("OpenAI API key", "openai_api_key"); err != nil {
			return err
		}

		// Anthropic
		if err := setViperKeyFromPrompt("Anthropic API key", "anthropic_api_key"); err != nil {
			return err
		}

		// Deepgram
		if err := setViperKeyFromPrompt("Deepgram API key", "deepgram_api_key"); err != nil {
			return err
		}

		// Groq
		if err := setViperKeyFromPrompt("Groq API key", "groq_api_key"); err != nil {
			return err
		}

		// Assembly AI
		if err := setViperKeyFromPrompt("AssemblyAI API key", "assemblyai_api_key"); err != nil {
			return err
		}

		err := viper.WriteConfigAs(viper.ConfigFileUsed())
		if err != nil {
			return fmt.Errorf("error writing config: %v", err)
		} else {
			fmt.Printf("Wrote to %s\n", viper.ConfigFileUsed())
		}
		return nil
	},
}
