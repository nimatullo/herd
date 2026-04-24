import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api"
import AddCow from "./add-cow"
import { cullCow } from "./barn"
import { usePulse, useHerd } from "./reins"
import {
  getCowState,
  wrangle,
  unleash,
  pen,
} from "./wrangler"
import CowTrail from "./trail"
import { Cow, CowMood } from "./breeds"

const MOOD_LABELS: Record<CowMood, string> = {
  penned: "stopped",
  grazing: "running",
  stirring: "starting",
  lame: "errored",
}

function moodIcon(mood: string) {
  switch (mood) {
    case "grazing":
      return { source: Icon.CircleFilled, tintColor: Color.Green }
    case "stirring":
      return { source: Icon.CircleFilled, tintColor: Color.Yellow }
    case "lame":
      return { source: Icon.CircleFilled, tintColor: Color.Red }
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText }
  }
}

function formatUptime(releasedAt: number): string {
  return new Date(releasedAt).toLocaleTimeString()
}

function CowRow({
  cow,
  onRefresh,
}: {
  cow: Cow
  onRefresh: () => void
}) {
  usePulse()
  const { push } = useNavigation()
  const state = getCowState(cow.tag)

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
    try {
      await pen(cow.tag)
      await showToast({
        style: Toast.Style.Success,
        title: `Stopped ${cow.name}`,
      })
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to stop",
        message: String(err),
      })
    }
  }

  const handleWrangle = async () => {
    try {
      await wrangle(cow)
      await showToast({
        style: Toast.Style.Success,
        title: `Restarting ${cow.name}`,
      })
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to restart",
        message: String(err),
      })
    }
  }

  const handleCull = async () => {
    const confirmed = await confirmAlert({
      title: `Delete "${cow.name}"?`,
      message: "This will stop the server if running and remove it.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    })
    if (!confirmed) return
    if (state.mood === "grazing") await pen(cow.tag)
    await cullCow(cow.tag)
    onRefresh()
    await showToast({
      style: Toast.Style.Success,
      title: `Deleted ${cow.name}`,
    })
  }

  const grazing = state.mood === "grazing"
  const subtitle = cow.pasture
  const accessories: List.Item.Accessory[] = []

  if (grazing && state.releasedAt) {
    accessories.push({
      text: formatUptime(state.releasedAt),
      icon: Icon.Clock,
    })
  }

  return (
    <List.Item
      key={cow.tag}
      icon={moodIcon(state.mood)}
      title={cow.name}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="View Logs"
              icon={Icon.Terminal}
              onAction={() => push(<CowTrail cow={cow} />)}
            />
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
            <Action.Push
              title="Add Server"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={<AddCow onSave={onRefresh} />}
            />
            <Action
              title="Delete Server"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={handleCull}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  )
}

export default function Shepherd() {
  const { herd, isLoading, refresh } = useHerd()
  usePulse()

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter servers..."
      navigationTitle="Manage Servers"
    >
      {herd.length === 0 ? (
        <List.EmptyView
          icon={Icon.Plus}
          title="No servers configured"
          description="Add a server to get started"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Server"
                icon={Icon.Plus}
                target={<AddCow onSave={refresh} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        herd.map((cow) => (
          <CowRow key={cow.tag} cow={cow} onRefresh={refresh} />
        ))
      )}
    </List>
  )
}
