
// utils/claudeRouter.ts

interface ChatCompletionRequest {
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
}

// This is the address for the local server running in LM Studio
const LM_STUDIO_URL = "http://localhost:1234/v1/chat/completions";

/**
 * Sends a prompt to the local model running in LM Studio and returns the response.
 * @param prompt The user's prompt to send to the model.
 * @returns A promise that resolves with the model's response as a string.
 */
export const getClaudeResponse = async (prompt: string): Promise<string> => {
  // The model name can be anything when using LM Studio, it's just a placeholder.
  // The actual model is the one you loaded in the LM Studio UI.
  const body: ChatCompletionRequest = {
    model: "local-model",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  };

  try {
    const response = await fetch(LM_STUDIO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ChatCompletionResponse = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error communicating with the local model:", error);
    // Provide a user-friendly error message
    return "Sorry, I couldn't get a response from the local model. Is LM Studio running correctly?";
  }
};
