import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api"
import { useState } from "react"
import { addCow } from "./barn"
import { Cow } from "./breeds"

interface AddCowProps {
  onSave: () => void
}

export default function AddCow({ onSave }: AddCowProps) {
  const { pop } = useNavigation()
  const [nameError, setNameError] = useState<string | undefined>()
  const [callError, setCallError] = useState<string | undefined>()
  const [pastureError, setPastureError] = useState<string | undefined>()

  async function handleCowAdd(values: {
    name: string
    call: string
    pasture: string[]
    setup: string
  }) {
    const name = values.name.trim()
    const call = values.call.trim()
    const pasture = values.pasture?.[0]
    const setup = values.setup?.trim() || undefined
    if (!name) {
      setNameError("Name is required")
      return
    }
    if (!call) {
      setCallError("Command is required")
      return
    }
    if (!pasture) {
      setPastureError("Working directory is required")
      return
    }

    const cow: Cow = {
      tag: Date.now().toString(),
      name,
      call,
      pasture,
      setup,
    }

    addCow(cow)
      .then(() => {
        showToast({
          style: Toast.Style.Success,
          title: `Added ${cow.name}`,
        })
        onSave()
        pop()
      })
      .catch((error) => {
        showToast({
          style: Toast.Style.Failure,
          title: `Failed to add ${cow.name}`,
          message: error.message,
        })
      })
  }

  return (
    <Form
      navigationTitle="Add Server"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Server" onSubmit={handleCowAdd} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Microservice Discovery Service"
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
      />
      <Form.TextField
        id="call"
        title="Command"
        placeholder="yarn dev"
        info="the command to start the server"
        error={callError}
        onChange={() => callError && setCallError(undefined)}
      />
      <Form.FilePicker
        id="pasture"
        title="Working Directory"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        error={pastureError}
        onChange={() => pastureError && setPastureError(undefined)}
      />
      <Form.TextField
        id="setup"
        title="Setup Command"
        placeholder="nvm use, rbenv shell 3.2, source .env, etc."
        info="Optional command to run before starting the server"
      />
    </Form>
  )
}
