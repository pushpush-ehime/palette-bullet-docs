import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRelationEdges } from '../docs/.vitepress/content/relation-graph.js'

function spec(url, relatedTasks = []) {
  return { url, pageType: 'spec', relatedTasks }
}

function task(url, relatedSpecs = []) {
  return { url, pageType: 'task', relatedSpecs }
}

test('タスク側だけのrelatedSpecsから関係を生成する', () => {
  const edges = buildRelationEdges([
    spec('/spec/player/jump'),
    task('/tasks/player/pb-task-0001', ['/spec/player/jump'])
  ])

  assert.deepEqual(edges, [
    {
      specUrl: '/spec/player/jump',
      taskUrl: '/tasks/player/pb-task-0001',
      declaredByTask: true,
      declaredBySpec: false
    }
  ])
})

test('仕様側だけのrelatedTasksから逆方向の関係を生成する', () => {
  const edges = buildRelationEdges([
    spec('/spec/player/jump', ['/tasks/player/pb-task-0001']),
    task('/tasks/player/pb-task-0001')
  ])

  assert.deepEqual(edges, [
    {
      specUrl: '/spec/player/jump',
      taskUrl: '/tasks/player/pb-task-0001',
      declaredByTask: false,
      declaredBySpec: true
    }
  ])
})

test('両側に同じ関係があっても1件へまとめて保存元を両方記録する', () => {
  const edges = buildRelationEdges([
    spec('/spec/player/', ['/tasks/player/pb-task-0001.html']),
    task('/tasks/player/pb-task-0001', ['spec/player/index'])
  ])

  assert.deepEqual(edges, [
    {
      specUrl: '/spec/player/',
      taskUrl: '/tasks/player/pb-task-0001',
      declaredByTask: true,
      declaredBySpec: true
    }
  ])
})

test('存在しないページや異なる種類への参照は関係に含めない', () => {
  const pages = [
    spec('/spec/player/jump', [
      '/tasks/missing',
      '/spec/player/jump'
    ]),
    task('/tasks/player/pb-task-0001', [
      '/spec/missing',
      '/tasks/player/pb-task-0001'
    ])
  ]

  assert.deepEqual(buildRelationEdges(pages), [])
})
