import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import OpenQuestions from './components/OpenQuestions.vue'
import PageMeta from './components/PageMeta.vue'
import RecentPages from './components/RecentPages.vue'
import SpecList from './components/SpecList.vue'
import StatusBadge from './components/StatusBadge.vue'
import TaskList from './components/TaskList.vue'
import './styles.css'

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'doc-before': () => h(PageMeta)
    }),
  enhanceApp({ app }) {
    app.component('OpenQuestions', OpenQuestions)
    app.component('RecentPages', RecentPages)
    app.component('SpecList', SpecList)
    app.component('StatusBadge', StatusBadge)
    app.component('TaskList', TaskList)
  }
}
