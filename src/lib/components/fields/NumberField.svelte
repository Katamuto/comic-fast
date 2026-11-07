<script lang="ts">
  interface Props {
    label: string;
    value: number;
    step?: number;
    min?: number;
    max?: number;
    digits?: number;
    onchange: (v: number) => void;
  }
  let { label, value, step = 1, min, max, digits = 1, onchange }: Props = $props();

  const shown = $derived(Math.round(value * 10 ** digits) / 10 ** digits);
</script>

<label class="field">
  <span>{label}</span>
  <input
    type="number"
    value={shown}
    {step}
    {min}
    {max}
    oninput={(e) => {
      const v = e.currentTarget.valueAsNumber;
      if (Number.isFinite(v)) onchange(v);
    }}
  />
</label>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    font-size: 0.9231rem;
    color: var(--muted);
  }
  input {
    width: 100%;
    color: var(--text);
  }
</style>
