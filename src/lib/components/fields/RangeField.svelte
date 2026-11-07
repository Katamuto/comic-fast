<script lang="ts">
  interface Props {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    onchange: (v: number) => void;
  }
  let { label, value, min, max, step = 0.01, onchange }: Props = $props();
</script>

<label class="field">
  <span>{label} <em>{Math.round(value * 100) / 100}</em></span>
  <input
    type="range"
    {min}
    {max}
    {step}
    {value}
    oninput={(e) => onchange(e.currentTarget.valueAsNumber)}
  />
</label>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 0.9231rem;
    color: var(--muted);
  }
  em {
    font-style: normal;
    color: var(--text);
    float: right;
  }
  input {
    width: 100%;
  }
</style>
