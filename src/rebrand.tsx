import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api"
import { useState } from "react"
import { rebrandCow } from "./barn"
import { Cow } from "./breeds"

interface RebrandProps {
  cow: Cow
  onSave?: () => void
}

export default function Rebrand({ cow, onSave }: RebrandProps) {
  const { pop } = useNavigation()
  const [nameError, setNameError] = useState<string | undefined>()
  const [callError, setCallError] = useState<string | undefined>()

  async function handleSubmit(values: {
    name: string
    call: string
    pasture: string[]
    setup: string
  }) {
    if (!values.name.trim()) {
      setNameError("Name is required")
      return
    }
    if (!values.call.trim()) {
      setCallError("Command is required")
      return
    }

    const pasture = values.pasture?.[0] || cow.pasture
    const setup = values.setup?.trim() || undefined

    rebrandCow(cow.tag, {
      name: values.name.trim(),
      call: values.call.trim(),
      pasture,
      setup,
    })
      .then(() => {
        showToast({
          style: Toast.Style.Success,
          title: `Updated ${values.name}`,
        })
        onSave?.()
        pop()
      })
      .catch((error) => {
        showToast({
          style: Toast.Style.Failure,
          title: `Failed to update ${values.name}`,
          message: error.message,
        })
      })
  }

  return (
    <Form
      navigationTitle={`Edit ${cow.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={cow.name}
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
      />
      <Form.TextField
        id="call"
        title="Command"
        defaultValue={cow.call}
        error={callError}
        onChange={() => callError && setCallError(undefined)}
      />
      <Form.FilePicker
        id="pasture"
        title="Working Directory"
        defaultValue={[cow.pasture]}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.TextField
        id="setup"
        title="Setup Command"
        defaultValue={cow.setup}
        placeholder="nvm use, rbenv shell 3.2, source .env, etc."
        info="Optional command to run before starting the server"
      />
    </Form>
  )
}
