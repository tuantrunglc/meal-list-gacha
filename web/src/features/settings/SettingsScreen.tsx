import { useState } from 'react'
import { Link } from 'react-router'
import { useCurrentHousehold } from '../../data/household'
import { useSaveCooldown, useSetConfig } from '../../data/setConfig'
import { DEFAULT_SET_KEY, getSet } from '../../sets/registry'
import { copy } from '../../ui/copy'
import { useSoundEnabled } from '../../ui/preferences'
import { showToast } from '../../ui/toast'
import './SettingsScreen.css'

const MIN_DAYS = 0
const MAX_DAYS = 30

export function SettingsScreen() {
  const set = getSet(DEFAULT_SET_KEY)
  const household = useCurrentHousehold()
  const config = useSetConfig(set.setKey)
  const save = useSaveCooldown(set.setKey)
  const [sound, setSound] = useSoundEnabled()
  const current = config.data ? (config.data.cooldownDays ?? set.defaultCooldownDays) : undefined
  // Giá trị đang chỉnh (null = chưa đụng, theo giá trị đã lưu)
  const [draft, setDraft] = useState<number | null>(null)
  const value = draft ?? current
  const changed = draft !== null && draft !== current
  // Chỉ thay stepper bằng lỗi khi chưa có dữ liệu (lỗi tải lại nền thì giữ số đang chỉnh)
  const loadError = config.data ? null : (config.error ?? household.error)

  function change(delta: number) {
    if (value === undefined) return
    save.reset()
    setDraft(Math.min(MAX_DAYS, Math.max(MIN_DAYS, value + delta)))
  }

  function onSave() {
    if (!changed || save.isPending || draft === null) return
    save.mutate(draft, {
      onSuccess: () => {
        setDraft(null)
        showToast(copy.settings.saved)
      },
    })
  }

  return (
    <div className="settings">
      <Link className="settings__back" to="/">
        {copy.settings.back}
      </Link>
      <h1 className="screen-title">{copy.settings.title}</h1>

      <section className="settings__card" aria-labelledby="cooldown-label">
        <h2 id="cooldown-label" className="settings__label">
          {copy.settings.cooldownLabel}
        </h2>
        {loadError ? (
          <div role="alert">
            <p className="form-error">{loadError.message}</p>
            <button
              type="button"
              className="button-secondary"
              onClick={() => void (config.error ? config.refetch() : household.refetch())}
            >
              {copy.retry}
            </button>
          </div>
        ) : value === undefined ? (
          <p role="status">{copy.settings.loading}</p>
        ) : (
          <>
            <div className="settings__stepper">
              <button
                type="button"
                className="settings__step"
                aria-label={copy.settings.decrease}
                onClick={() => change(-1)}
                disabled={value <= MIN_DAYS || save.isPending}
              >
                −
              </button>
              <output className="settings__value" aria-live="polite">
                {copy.settings.days(value)}
              </output>
              <button
                type="button"
                className="settings__step"
                aria-label={copy.settings.increase}
                onClick={() => change(1)}
                disabled={value >= MAX_DAYS || save.isPending}
              >
                +
              </button>
            </div>
            <p className="settings__help">{copy.settings.cooldownHelp(value)}</p>
            {save.error && (
              <p className="form-error" role="alert">
                {save.error.message}
              </p>
            )}
            <button type="button" className="button-primary settings__save" onClick={onSave} disabled={!changed || save.isPending || !save.ready}>
              {save.isPending ? copy.settings.saving : save.error ? copy.retry : copy.settings.save}
            </button>
          </>
        )}
      </section>

      <section className="settings__card">
        <div className="settings__row">
          <div>
            <h2 id="sound-label" className="settings__label">
              {copy.settings.sound}
            </h2>
            <p className="settings__help" id="sound-help">
              {copy.settings.soundHelp}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            className="settings__switch"
            aria-checked={sound}
            aria-labelledby="sound-label"
            aria-describedby="sound-help"
            onClick={() => setSound(!sound)}
          >
            <span className="settings__knob" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  )
}
