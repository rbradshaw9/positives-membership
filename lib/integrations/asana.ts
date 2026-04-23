const DEFAULT_BETA_FEEDBACK_SECTION_GID = "1214140242515252";
const ASANA_API_BASE = "https://app.asana.com/api/1.0";

type AsanaTaskSummary = {
  gid: string;
  name: string;
  completed?: boolean;
  permalink_url?: string;
};

type AsanaApiResponse<T> = {
  data: T;
};

function getAsanaConfig() {
  const token = process.env.ASANA_ACCESS_TOKEN;
  const projectGid = process.env.ASANA_PROJECT_GID;
  const workspaceGid = process.env.ASANA_WORKSPACE_GID;
  const betaFeedbackSectionGid =
    process.env.ASANA_BETA_FEEDBACK_SECTION_GID || DEFAULT_BETA_FEEDBACK_SECTION_GID;

  return {
    token,
    projectGid,
    workspaceGid,
    betaFeedbackSectionGid,
    configured: Boolean(token && projectGid && workspaceGid),
  };
}

async function asanaFetch<T>(path: string, init: RequestInit = {}) {
  const { token } = getAsanaConfig();
  if (!token) throw new Error("ASANA_ACCESS_TOKEN is not configured.");

  const response = await fetch(`${ASANA_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body = (await response.json().catch(() => null)) as AsanaApiResponse<T> | null;
  if (!response.ok) {
    throw new Error(`Asana request failed (${response.status}): ${JSON.stringify(body)}`);
  }

  if (!body) throw new Error("Asana returned an empty response.");
  return body.data;
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3).trim()}...` : value;
}

export function getBetaFeedbackAsanaSectionGid() {
  return getAsanaConfig().betaFeedbackSectionGid;
}

export async function getOpenBetaFeedbackAsanaTasks() {
  const config = getAsanaConfig();
  if (!config.configured) {
    return {
      configured: false,
      sectionGid: config.betaFeedbackSectionGid,
      tasks: [] as AsanaTaskSummary[],
      error: "ASANA_ACCESS_TOKEN, ASANA_PROJECT_GID, or ASANA_WORKSPACE_GID is missing.",
    };
  }

  try {
    const tasks = await asanaFetch<AsanaTaskSummary[]>(
      `/sections/${config.betaFeedbackSectionGid}/tasks?opt_fields=gid,name,completed,permalink_url&limit=100`
    );
    return {
      configured: true,
      sectionGid: config.betaFeedbackSectionGid,
      tasks: tasks.filter((task) => !task.completed),
      error: null as string | null,
    };
  } catch (error) {
    return {
      configured: true,
      sectionGid: config.betaFeedbackSectionGid,
      tasks: [] as AsanaTaskSummary[],
      error: error instanceof Error ? error.message : "Asana task lookup failed.",
    };
  }
}

export async function createAsanaTaskForBetaFeedback(params: {
  feedbackId: string;
  memberEmail: string;
  memberName: string | null;
  summary: string;
  details: string;
  expectedBehavior: string | null;
  category: string;
  severity: string;
  pageUrl: string | null;
  pagePath: string | null;
  browserName: string | null;
  osName: string | null;
  deviceType: string | null;
  triageNotes?: string | null;
  approvalNotes?: string | null;
  adminQueueUrl?: string | null;
}) {
  const config = getAsanaConfig();
  if (!config.configured) {
    return {
      created: false,
      reason: "ASANA_ACCESS_TOKEN, ASANA_PROJECT_GID, or ASANA_WORKSPACE_GID is missing.",
      taskGid: null,
      taskUrl: null,
    };
  }

  const name = truncate(`Beta feedback: ${params.summary}`, 120);
  const reporter = params.memberName
    ? `${params.memberName} <${params.memberEmail}>`
    : params.memberEmail;
  const notes = [
    `Source: beta feedback submission ${params.feedbackId}`,
    params.adminQueueUrl ? `Admin queue: ${params.adminQueueUrl}` : null,
    `Reporter: ${reporter}`,
    `Severity: ${params.severity}`,
    `Category: ${params.category}`,
    params.pageUrl ? `Page: ${params.pageUrl}` : params.pagePath ? `Page path: ${params.pagePath}` : null,
    [params.browserName, params.osName, params.deviceType].filter(Boolean).length
      ? `Context: ${[params.browserName, params.osName, params.deviceType].filter(Boolean).join(" / ")}`
      : null,
    "",
    "Tester summary:",
    params.summary,
    "",
    "What happened:",
    params.details,
    params.expectedBehavior ? "" : null,
    params.expectedBehavior ? "Expected instead:" : null,
    params.expectedBehavior,
    params.triageNotes ? "" : null,
    params.triageNotes ? "Internal clarification and triage notes:" : null,
    params.triageNotes,
    params.approvalNotes ? "" : null,
    params.approvalNotes ? "Super admin approval note:" : null,
    params.approvalNotes,
    "",
    "Review workflow:",
    "- Human review: confirm the problem statement, reproduction path, and whether clarification is still needed.",
    "- Agent review: identify likely root cause, recommended fix direction, and verification plan before changing code.",
    "- After implementation, comment with commit, verification steps, and production status.",
    "- Keep the beta feedback record and this Asana task linked as the source of truth.",
    "",
    "Definition of done:",
    "- Root cause or design change is documented.",
    "- Fix or decision is verified in the product.",
    "- Beta feedback record is updated with the outcome.",
  ]
    .filter((line): line is string => line !== null && line !== undefined)
    .join("\n");

  try {
    const task = await asanaFetch<AsanaTaskSummary>("/tasks?opt_fields=gid,name,permalink_url", {
      method: "POST",
      body: JSON.stringify({
        data: {
          workspace: config.workspaceGid,
          name,
          notes,
          memberships: [
            {
              project: config.projectGid,
              section: config.betaFeedbackSectionGid,
            },
          ],
        },
      }),
    });

    return {
      created: true,
      reason: null,
      taskGid: task.gid,
      taskUrl: task.permalink_url ?? null,
    };
  } catch (error) {
    return {
      created: false,
      reason: error instanceof Error ? error.message : "Asana task creation failed.",
      taskGid: null,
      taskUrl: null,
    };
  }
}

export async function addCommentToAsanaTask(taskGid: string, text: string) {
  try {
    const story = await asanaFetch<{ gid: string }>(`/tasks/${taskGid}/stories`, {
      method: "POST",
      body: JSON.stringify({
        data: {
          text,
        },
      }),
    });

    return {
      added: true,
      storyGid: story.gid,
      reason: null as string | null,
    };
  } catch (error) {
    return {
      added: false,
      storyGid: null,
      reason: error instanceof Error ? error.message : "Asana comment creation failed.",
    };
  }
}
