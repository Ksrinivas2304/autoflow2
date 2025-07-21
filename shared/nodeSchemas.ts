export const nodeSchemas: Record<string, any> = {
  webhook: {
    type: "webhook",
    name: "Webhook Trigger",
    parameters: {
      httpMethod: { type: "string", options: ["GET", "POST", "PUT", "DELETE", "PATCH"], required: true, description: "HTTP method to listen for." },
      path: { type: "string", required: true, description: "The URL path for the webhook (e.g., /webhook/your-path)." },
      authentication: { type: "string", options: ["none", "basic", "token"], required: false, description: "Authentication type for incoming requests." },
      responseMode: { type: "string", options: ["immediate", "onLastNode"], required: false, description: "When to send the webhook response." },
      responseData: { type: "string", options: ["firstEntryJson", "entireRunJson"], required: false, description: "What data to return in the webhook response." },
    },
  },
  schedule: {
    type: "schedule",
    name: "Scheduled Trigger",
    parameters: {
      cronExpression: { type: "string", required: true, description: "Cron expression for scheduling (e.g., 0 9 * * *)." },
      timezone: { type: "string", required: false, description: "Timezone for the schedule (e.g., Asia/Kolkata)." },
    },
  },
  send_email: {
    type: "send_email",
    name: "Send Email",
    parameters: {
      provider: { type: "string", options: ["smtp", "gmail", "sendgrid"], required: true, description: "Email provider to use for sending." },
      to: { type: "string", required: true, description: "Recipient email address." },
      subject: { type: "string", required: true, description: "Email subject line." },
      body: { type: "string", required: true, description: "Email body (HTML allowed)." },
      attachments: { type: "array", items: { type: "string" }, required: false, description: "List of file URLs to attach." },
    },
  },
  slack: {
    type: "slack",
    name: "Slack Notification",
    parameters: {
      webhookUrl: { type: "string", required: true, description: "Slack webhook URL." },
      channel: { type: "string", required: false, description: "Slack channel (e.g., #notifications)." },
      message: { type: "string", required: true, description: "Message to send to Slack." },
    },
  },
  api_request: {
    type: "api_request",
    name: "API Request",
    parameters: {
      method: { type: "string", options: ["GET", "POST", "PUT", "DELETE"], required: true, description: "HTTP method for the request." },
      url: { type: "string", required: true, description: "API endpoint URL." },
      headers: { type: "object", required: false, description: "HTTP headers as a JSON object." },
      body: { type: "object", required: false, description: "Request body as a JSON object." },
    },
  },
  if_else: {
    type: "if_else",
    name: "Check Form Field",
    parameters: {
      conditions: { type: "array", items: { type: "object", properties: { left: { type: "string" }, operator: { type: "string", options: ["greater_than", "less_than", "equals"] }, right: { type: "string" } } }, required: true, description: "List of conditions to check (left, operator, right)." },
    },
  },
  loop: {
    type: "loop",
    name: "Loop Through Items",
    parameters: {
      inputArray: { type: "string", required: true, description: "Array or list to loop through (e.g., {{data.items}})." },
      maxIterations: { type: "number", required: false, description: "Maximum number of iterations." },
    },
  },
  postgres: {
    type: "postgres",
    name: "Query Postgres",
    parameters: {
      query: { type: "string", required: true, description: "SQL query to execute." },
    },
  },
  firebase: {
    type: "firebase",
    name: "Write to Firebase",
    parameters: {
      path: { type: "string", required: true, description: "Firebase path (e.g., /users/{{data.userId}})." },
      method: { type: "string", options: ["set", "update"], required: true, description: "Firebase write method." },
      data: { type: "object", required: true, description: "Data to write as a JSON object." },
    },
  },
  redis: {
    type: "redis",
    name: "Redis Operation",
    parameters: {
      action: { type: "string", options: ["set", "get", "delete"], required: true, description: "Redis action to perform." },
      key: { type: "string", required: true, description: "Redis key." },
      value: { type: "string", required: false, description: "Value to set (for set action)." },
    },
  },
  parse_csv: {
    type: "parse_csv",
    name: "Parse CSV",
    parameters: {
      input: { type: "string", required: true, description: "CSV file input or data." },
      delimiter: { type: "string", required: false, description: "CSV delimiter (default: ,)." },
    },
  },
  pdf_extract: {
    type: "pdf_extract",
    name: "Extract PDF Text",
    parameters: {
      fileUrl: { type: "string", required: true, description: "URL of the PDF file to extract text from." },
    },
  },
  ai_summarizer: {
    type: "ai_summarizer",
    name: "Summarize Text",
    parameters: {
      provider: { type: "string", options: ["openai", "huggingface"], required: true, description: "AI provider to use for summarization." },
      promptTemplate: { type: "string", required: true, description: "Prompt template for the AI model." },
    },
  },
  airtable: {
    type: "airtable",
    name: "Push to Airtable",
    parameters: {
      apiKey: { type: "string", required: true, description: "Airtable API key." },
      baseId: { type: "string", required: true, description: "Airtable base ID." },
      tableName: { type: "string", required: true, description: "Airtable table name." },
      record: { type: "object", required: true, description: "Record data as a JSON object." },
    },
  },
  s3file: {
    type: "s3file",
    name: "S3 File Trigger",
    parameters: {
      bucket: { type: "string", required: true, description: "S3 bucket name to watch for new files." },
      prefix: { type: "string", required: false, description: "Prefix (folder) to filter files." },
      event: { type: "string", options: ["put", "delete"], required: true, description: "S3 event type to trigger on." },
    },
  },
  fileupload: {
    type: "fileupload",
    name: "File Upload Trigger",
    parameters: {
      accept: { type: "string", required: false, description: "Accepted file types (e.g., pdf,csv)." },
      maxSizeMB: { type: "number", required: false, description: "Maximum file size in MB." },
    },
  },
  enrich: {
    type: "enrich",
    name: "Enrich Data (API)",
    parameters: {
      apiUrl: { type: "string", required: true, description: "API endpoint to enrich data." },
      apiKey: { type: "string", required: false, description: "API key for authentication." },
      inputField: { type: "string", required: true, description: "Field in the data to enrich." },
    },
  },
}; 