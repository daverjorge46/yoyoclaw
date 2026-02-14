#!/usr/bin/env python3
import json
import os
import sys
import argparse

def load_config(config_path):
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: Configuration file not found at {config_path}")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON in configuration file {config_path}")
        sys.exit(1)

def check_env_vars(required_vars):
    missing = []
    for var in required_vars:
        if var not in os.environ:
            missing.append(var)
    return missing

def check_files(required_files):
    missing = []
    for file_path in required_files:
        # Expand user path if necessary (e.g. ~/)
        expanded_path = os.path.expanduser(file_path)
        if not os.path.exists(expanded_path):
            missing.append(file_path)
    return missing

def main():
    parser = argparse.ArgumentParser(description="Check configuration health based on defined rules.")
    parser.add_argument("--config", default="config/health_checks.json", help="Path to health check configuration file")
    parser.add_argument("--feature", help="Specific feature to check (default: all)")
    args = parser.parse_args()

    config = load_config(args.config)

    # Filter features if a specific one is requested
    if args.feature:
        if args.feature not in config:
            print(f"Error: Feature '{args.feature}' not found in configuration.")
            sys.exit(1)
        features_to_check = [args.feature]
    else:
        features_to_check = list(config.keys())

    all_passed = True

    print(f"Checking configuration health for {len(features_to_check)} feature(s)...")
    print("-" * 40)

    for feature in features_to_check:
        requirements = config[feature]
        feature_passed = True
        print(f"Feature: {feature}")

        # Check Environment Variables
        if "env" in requirements:
            missing_env = check_env_vars(requirements["env"])
            if missing_env:
                print(f"  [FAIL] Missing environment variables: {', '.join(missing_env)}")
                feature_passed = False
            else:
                print(f"  [OK] Environment variables present")

        # Check Files
        if "files" in requirements:
            missing_files = check_files(requirements["files"])
            if missing_files:
                print(f"  [FAIL] Missing files: {', '.join(missing_files)}")
                feature_passed = False
            else:
                print(f"  [OK] Required files present")

        if feature_passed:
            print(f"  => STATUS: HEALTHY")
        else:
            print(f"  => STATUS: UNHEALTHY")
            all_passed = False
        print("-" * 40)

    if not all_passed:
        print("Health check FAILED. Some features are missing configuration.")
        sys.exit(1)
    else:
        print("Health check PASSED. All checked features are healthy.")
        sys.exit(0)

if __name__ == "__main__":
    main()
