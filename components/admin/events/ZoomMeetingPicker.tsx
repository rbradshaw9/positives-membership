"use client";

import { useEffect, useState } from "react";
import type { ZoomConnectionOption } from "@/lib/events/types";

type ZoomItem = {
  id: string;
  topic: string;
  start_time: string | null;
  join_url: string | null;
};

export function ZoomMeetingPicker({
  connections,
  defaultConnectionId,
  defaultObjectType,
  connectReturn,
  mode,
}: {
  connections: ZoomConnectionOption[];
  defaultConnectionId?: string;
  defaultObjectType?: "meeting" | "webinar";
  connectReturn: string;
  mode: "create" | "existing";
}) {
  const [connectionId, setConnectionId] = useState(defaultConnectionId ?? "");
  const [objectType, setObjectType] = useState(defaultObjectType ?? "meeting");
  const [items, setItems] = useState<ZoomItem[]>([]);
  const [selected, setSelected] = useState("");
  const selectedItem =
    mode === "existing" && connectionId ? items.find((item) => item.id === selected) : undefined;

  useEffect(() => {
    if (mode !== "existing" || !connectionId) {
      return;
    }
    const controller = new AbortController();
    fetch(`/api/admin/integrations/zoom/meetings?connectionId=${connectionId}&type=${objectType}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data: { items?: ZoomItem[] }) => {
        setItems(data.items ?? []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setItems([]);
      });
    return () => controller.abort();
  }, [connectionId, objectType, mode]);

  return (
    <div className="rounded-2xl border border-border p-4">
      <input type="hidden" name="zoom_object_id" value={selectedItem?.id ?? ""} />
      <input type="hidden" name="zoom_join_url" value={selectedItem?.join_url ?? ""} />

      <div className="admin-form-grid-2">
        <div className="admin-form-field">
          <label htmlFor="zoom_connection_id" className="admin-label">
            Zoom account
          </label>
          <select
            id="zoom_connection_id"
            name="zoom_connection_id"
            value={connectionId}
            onChange={(event) => {
              setSelected("");
              setConnectionId(event.target.value);
            }}
            className="admin-select"
          >
            <option value="">Choose Zoom account</option>
            {connections.map((connection) => (
              <option key={connection.id} value={connection.id}>
                {connection.owner_kind === "coach" ? "Coach" : "Platform"} - {connection.label}
                {connection.zoom_user_email ? ` (${connection.zoom_user_email})` : ""}
              </option>
            ))}
          </select>
          <a
            href={`/api/admin/integrations/zoom/connect?ownerKind=platform&returnTo=${encodeURIComponent(connectReturn)}`}
            className="mt-2 inline-flex text-xs font-semibold text-primary"
          >
            Create new Zoom connection
          </a>
        </div>

        <div className="admin-form-field">
          <label htmlFor="zoom_object_type" className="admin-label">
            Zoom object
          </label>
          <select
            id="zoom_object_type"
            name="zoom_object_type"
            value={objectType}
            onChange={(event) => {
              setSelected("");
              setObjectType(event.target.value === "webinar" ? "webinar" : "meeting");
            }}
            className="admin-select"
          >
            <option value="meeting">Meetings</option>
            <option value="webinar">Webinars</option>
          </select>
        </div>
      </div>

      {mode === "existing" ? (
        <div className="admin-form-field">
          <label htmlFor="zoom_existing_picker" className="admin-label">
            Existing Zoom session
          </label>
          <select
            id="zoom_existing_picker"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className="admin-select"
            disabled={!connectionId}
          >
            <option value="">Choose an existing session</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.topic} {item.start_time ? `- ${new Date(item.start_time).toLocaleString()}` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
