// This file provides a Kong resolver that loads configuration from a TOML file.
// It is a lightly modified version of the kongtoml package.
//
// It checks if the ytt subcommand is used and if so, it uses the parent path to
// construct the key. This makes the configuration file more readable and ergonomic.
package main

import (
	"io"
	"strings"

	"github.com/alecthomas/kong"
	"github.com/pelletier/go-toml/v2"
)

func ConfLoader(r io.Reader) (kong.Resolver, error) {
	var tree map[string]any
	decoder := toml.NewDecoder(r)
	if err := decoder.Decode(&tree); err != nil {
		return nil, err
	}
	var filename string
	if named, ok := r.(interface{ Name() string }); ok {
		filename = named.Name()
	}
	return &ConfResolver{filename: filename, tree: tree}, nil
}

type ConfResolver struct {
	filename string
	tree     map[string]any
}

func (r *ConfResolver) Resolve(kctx *kong.Context, parent *kong.Path, flag *kong.Flag) (interface{}, error) {
	value, ok := r.findValue(parent, flag)
	if !ok {
		return nil, nil
	}
	return value, nil
}

func (r *ConfResolver) Validate(app *kong.Application) error {
	// TODO: Validate the configuration maps to valid flags.
	return nil
}

func (r *ConfResolver) findValue(parent *kong.Path, flag *kong.Flag) (any, bool) {
	// Get parent path, converting to empty string if "ytt"
	path := parent.Node().Path()
	if path == "ytt" {
		path = ""
	}

	keys := []string{
		strings.ReplaceAll(path, " ", "-") + "-" + flag.Name,
		flag.Name,
	}

	for _, key := range keys {
		parts := strings.Split(key, "-")
		if value, ok := r.findValueParts(parts[0], parts[1:], r.tree); ok {
			return value, ok
		}
	}
	return nil, false
}

func (r *ConfResolver) findValueParts(prefix string, suffix []string, tree map[string]any) (any, bool) {
	if value, ok := tree[prefix]; ok {
		if len(suffix) == 0 {
			return value, true
		}
		if branch, ok := value.(map[string]any); ok {
			return r.findValueParts(suffix[0], suffix[1:], branch)
		}
	} else if len(suffix) > 0 {
		return r.findValueParts(prefix+"-"+suffix[0], suffix[1:], tree)
	}
	return nil, false
}
