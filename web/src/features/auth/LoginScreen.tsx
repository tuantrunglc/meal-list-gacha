import { useState, type FormEvent } from 'react'
import { useLogin } from '../../data/auth'
import { copy } from '../../ui/copy'
import './LoginScreen.css'

export function LoginScreen() {
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (login.isPending) return
    login.mutate({ email, password })
  }

  return (
    <main className="login">
      <img className="login__logo" src="/favicon.svg" alt="" width={96} height={96} />
      <h1 className="login__title">{copy.login.title}</h1>
      <p className="login__subtitle">{copy.login.subtitle}</p>
      <form className="login__form" onSubmit={onSubmit} noValidate>
        <label className="field">
          <span className="field__label">{copy.login.email}</span>
          <input
            className="input"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (login.error) login.reset()
            }}
          />
        </label>
        <label className="field">
          <span className="field__label">{copy.login.password}</span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (login.error) login.reset()
            }}
          />
        </label>
        {login.error && (
          <p className="form-error" role="alert">
            {login.error.message}
          </p>
        )}
        <button className="button-primary" type="submit" disabled={login.isPending || !email.trim() || !password}>
          {login.isPending ? copy.login.submitting : copy.login.submit}
        </button>
      </form>
    </main>
  )
}
