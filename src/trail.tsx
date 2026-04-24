import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  showToast,
  Toast,
} from "@raycast/api"
import { Cow, CowMood } from "./breeds"
import { usePulse } from "./reins"
import { clearTracks, getCowState, pen, unleash, wrangle } from "./wrangler"

const VISIBLE_TRACK_LINES = 500

const MOOD_LABELS: Record<CowMood, string> = {
  penned: "stopped",
  grazing: "running",
  stirring: "starting",
  lame: "errored",
}

interface CowTrailProps {
  cow: Cow
}

export default function CowTrail({ cow }: CowTrailProps) {
  const pulse = usePulse()
  const state = getCowState(cow.tag)
  const grazing = state.mood === "grazing"

  const visibleTracks = state.tracks.slice(-VISIBLE_TRACK_LINES)
  const trackContent =
    visibleTracks.length > 0 ? visibleTracks.join("\n") : "No logs yet..."
  const truncated = state.tracks.length > VISIBLE_TRACK_LINES

  const markdown = [
    `# ${cow.name}`,
    "",
    truncated
      ? `> Showing last ${VISIBLE_TRACK_LINES} of ${state.tracks.length} lines\n`
      : "",
    "```",
    trackContent,
    "```",
  ].join("\n")

  const handleUnleash = async () => {
    try {
      unleash(cow)
      await showToast({
        style: Toast.Style.Success,
        title: `Starting ${cow.name}`,
      })
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to start",
        message: String(err),
      })
    }
  }

  const handlePen = async () => {
    pen(cow.tag)
      .then(() => {
        showToast({
          style: Toast.Style.Success,
          title: `Stopped ${cow.name}`,
        })
      })
      .catch((err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to stop",
          message: String(err),
        })
      })
  }

  const handleWrangle = async () => {
    wrangle(cow)
      .then(() => {
        showToast({
          style: Toast.Style.Success,
          title: `Restarting ${cow.name}`,
        })
      })
      .catch((err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to restart",
          message: String(err),
        })
      })
  }

  const handleClearTracks = () => {
    clearTracks(cow.tag)
  }

  const moodColor = grazing
    ? Color.Green
    : state.mood === "lame"
      ? Color.Red
      : Color.SecondaryText

  return (
    <Detail
      navigationTitle={`${cow.name} — Logs`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={MOOD_LABELS[state.mood]}
              color={moodColor}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Command" text={cow.call} />
          <Detail.Metadata.Label title="Directory" text={cow.pasture} />
          {state.brand ? (
            <Detail.Metadata.Label title="PID" text={String(state.brand)} />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Log Lines"
            text={`${state.tracks.length}`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {grazing ? (
              <Action
                title="Stop Server"
                icon={Icon.Stop}
                style={Action.Style.Destructive}
                onAction={handlePen}
              />
            ) : (
              <Action
                title="Start Server"
                icon={Icon.Play}
                onAction={handleUnleash}
              />
            )}
            {grazing && (
              <Action
                title="Restart Server"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={handleWrangle}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Clear Logs"
              icon={Icon.Eraser}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              onAction={handleClearTracks}
            />
            <Action.CopyToClipboard
              title="Copy Logs"
              content={state.tracks.join("\n")}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  )
}
