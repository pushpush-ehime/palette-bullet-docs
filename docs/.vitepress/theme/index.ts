import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import NotionTaskLink from './components/NotionTaskLink.vue'
import OpenQuestions from './components/OpenQuestions.vue'
import PageMeta from './components/PageMeta.vue'
import PageRelations from './components/PageRelations.vue'
import RecentPages from './components/RecentPages.vue'
import RelationMap from './components/RelationMap.vue'
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
    app.component('NotionTaskLink', NotionTaskLink)
    app.component('OpenQuestions', OpenQuestions)
    app.component('PageRelations', PageRelations)
    app.component('RecentPages', RecentPages)
    app.component('RelationMap', RelationMap)
    app.component('SpecList', SpecList)
    app.component('StatusBadge', StatusBadge)
    app.component('TaskList', TaskList)
  }
}
