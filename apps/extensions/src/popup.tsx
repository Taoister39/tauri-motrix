import "@tauri-motrix/ux-base/styles.css";
import "./popup.css";

import {
  Button,
  Checkbox,
  EmptyState,
  IconButton,
  MenuButton,
  Progress,
  Switch,
  TextField,
} from "@tauri-motrix/ux-base/components";
import { UxTheme } from "@tauri-motrix/ux-base/theme";
import type { ThemeMode } from "@tauri-motrix/ux-base/tokens";
import { useState } from "react";
import { createRoot } from "react-dom/client";

export function Popup() {
  const [mode, setMode] = useState<ThemeMode>("system");
  const [name, setName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [value, setValue] = useState(30);
  const [submitted, setSubmitted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <UxTheme mode={mode} className="popup">
      <header>
        <h1>Motrix UI verification</h1>
        <MenuButton
          open={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Verification menu"
          aria-controls="popup-info"
        />
      </header>
      {menuOpen && (
        <p id="popup-info">
          This page verifies shared components. Closing the popup resets its
          state. It does not connect to the download service.
        </p>
      )}
      <div role="group" aria-label="Theme" className="row">
        {(["light", "dark", "system"] as const).map((item) => (
          <Button
            key={item}
            size="sm"
            variant={mode === item ? "primary" : "secondary"}
            aria-pressed={mode === item}
            onClick={() => setMode(item)}
          >
            {item === "light" ? "Light" : item === "dark" ? "Dark" : "System"}
          </Button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
        }}
      >
        <TextField
          label="Resource name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setSubmitted(false);
          }}
          helpText="For input and submission testing only"
          error={
            submitted && !name.trim() ? "Enter a resource name" : undefined
          }
        />
        <Checkbox
          label="For UI verification only"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <Button type="submit" disabled={!confirmed}>
          Validate form
        </Button>
        {submitted && name.trim() && <p role="status">Validated: {name}</p>}
      </form>
      <Switch
        label="Unknown total size"
        checked={unknown}
        onChange={(event) => setUnknown(event.target.checked)}
      />
      <Progress
        value={unknown ? undefined : value}
        label="Example progress"
        showValue
      />
      <div className="row">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setValue(Math.min(100, value + 10))}
        >
          Increase progress
        </Button>
        <IconButton
          size="sm"
          aria-label="Reset progress"
          onClick={() => setValue(0)}
        >
          ↺
        </IconButton>
        <Button size="sm" loading>
          Loading
        </Button>
      </div>
      <EmptyState text="No real tasks" icon="↓" />
    </UxTheme>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
