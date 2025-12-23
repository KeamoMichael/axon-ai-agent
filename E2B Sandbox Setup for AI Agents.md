# E2B Sandbox Setup for AI Agents

**Author:** Manus AI

## 1. Introduction

This document provides a comprehensive guide for developers on setting up a virtual computer sandbox for AI agents using E2B. E2B provides a secure and isolated environment where AI agents can execute code, create and manage files, and access the internet. This allows for the development of powerful and versatile AI agents while maintaining a secure and controlled execution environment.

E2B sandboxes are lightweight, fast-starting virtual machines that can be managed programmatically using either a Python or a JavaScript/TypeScript SDK. This guide will cover the essential steps to get started with E2B, including initial setup, file management, internet access control, and command execution.

## 2. Initial Setup

Getting started with E2B involves creating an account, obtaining an API key, and installing the necessary SDK.

### 2.1. Account and API Key

First, you will need to create an account on the E2B platform. New accounts are provided with free credits to get started. Once your account is created, you can obtain your API key from the E2B Dashboard. This key is essential for authenticating your requests to the E2B API.

It is recommended to store your API key in an environment variable for security. Create a `.env` file in your project's root directory and add the following line:

```
E2B_API_KEY=your_e2b_api_key
```

### 2.2. SDK Installation

E2B offers SDKs for both Python and JavaScript/TypeScript. You can install the appropriate SDK for your project using the following commands.

**JavaScript/TypeScript:**

```bash
npm install @e2b/code-interpreter dotenv
```

**Python:**

```bash
pip install e2b-code-interpreter python-dotenv
```

## 3. Creating and Using the Sandbox

Once the SDK is installed and the API key is configured, you can create and interact with a sandbox.

### 3.1. Basic Sandbox Creation

The following code demonstrates how to create a sandbox and run a simple command.

**JavaScript/TypeScript:**

```javascript
import 'dotenv/config';
import { Sandbox } from '@e2b/code-interpreter';

async function main() {
  const sandbox = await Sandbox.create();
  console.log('Sandbox created.');

  // Your code to interact with the sandbox goes here

  await sandbox.close();
}

main();
```

**Python:**

```python
import os
from dotenv import load_dotenv
from e2b import Sandbox

load_dotenv()

def main():
    sandbox = Sandbox()
    print("Sandbox created.")

    # Your code to interact with the sandbox goes here

    sandbox.close()

if __name__ == "__main__":
    main()
```

## 4. Filesystem Management

E2B sandboxes have an isolated filesystem that allows for the creation, reading, writing, and deletion of files. This is crucial for agents that need to process data or generate artifacts.

### 4.1. Writing Files

You can write content to a file within the sandbox using the `files.write()` method.

**JavaScript/TypeScript:**

```javascript
await sandbox.files.write('/home/user/test.txt', 'Hello, World!');
```

**Python:**

```python
sandbox.filesystem.write('/home/user/test.txt', 'Hello, World!')
```

### 4.2. Reading Files

To read the content of a file from the sandbox, use the `files.read()` method.

**JavaScript/TypeScript:**

```javascript
const content = await sandbox.files.read('/home/user/test.txt');
console.log(content);
```

**Python:**

```python
content = sandbox.filesystem.read('/home/user/test.txt')
print(content)
```

### 4.3. Uploading and Downloading Files

E2B simplifies the process of moving files between your local environment and the sandbox.

- **Uploading:** To upload a file, you first read it from your local filesystem and then write its content to the sandbox.
- **Downloading:** To download a file, you read its content from the sandbox and then write it to your local filesystem.

## 5. Internet Access

By default, sandboxes have internet access enabled. This allows agents to browse websites, download resources, or interact with APIs. You can control this behavior for security-sensitive tasks.

### 5.1. Disabling Internet Access

You can disable internet access when creating a sandbox by setting the `allowInternetAccess` option to `false`.

**JavaScript/TypeScript:**

```javascript
const isolatedSandbox = await Sandbox.create({ allowInternetAccess: false });
```

**Python:**

```python
isolated_sandbox = Sandbox(allow_internet_access=False)
```

### 5.2. Fine-Grained Network Control

For more granular control, you can specify allow and deny lists for outbound traffic using the `network` configuration. This allows you to restrict access to specific IP addresses or CIDR blocks.

## 6. Command Execution

AI agents can execute terminal commands within the sandbox, enabling a wide range of capabilities, from running scripts to installing packages.

The `commands.run()` method is used to execute a command. The method returns the command's output, including stdout, stderr, and the exit code.

**JavaScript/TypeScript:**

```javascript
const { stdout, stderr, exitCode } = await sandbox.commands.run('ls -l /home/user');
console.log('STDOUT:', stdout);
console.log('STDERR:', stderr);
```

**Python:**

```python
proc = sandbox.process.start('ls -l /home/user')
proc.wait()
print('STDOUT:', proc.stdout)
print('STDERR:', proc.stderr)
```

## 7. References

- [1] E2B Documentation: [https://e2b.dev/docs](https://e2b.dev/docs)
- [2] Quickstart Guide: [https://e2b.dev/docs/quickstart](https://e2b.dev/docs/quickstart)
- [3] Filesystem - Read & Write: [https://e2b.dev/docs/filesystem/read-write](https://e2b.dev/docs/filesystem/read-write)
- [4] Internet Access: [https://e2b.dev/docs/sandbox/internet-access](https://e2b.dev/docs/sandbox/internet-access)
- [5] Running Commands: [https://e2b.dev/docs/commands](https://e2b.dev/docs/commands)
