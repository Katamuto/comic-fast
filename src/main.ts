import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { appearance } from './lib/app/appearance.svelte';
import { i18n } from './lib/i18n/index.svelte';
import './lib/resources/patternFiles';

// Antes de montar: evita el parpadeo del tema/tamaño al arrancar.
appearance.apply();
i18n.apply();

const app = mount(App, { target: document.getElementById('app')! });

export default app;
