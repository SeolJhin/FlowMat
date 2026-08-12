import type { EditorDocument } from '../model/EditorDocument'
import { createEmptyEditorDocument } from '../model/EditorDocument'

export type EditorStoreListener = (doc: EditorDocument) => void
export type EditorDocumentUpdater = (doc: EditorDocument) => EditorDocument

export class EditorStore {
  private doc: EditorDocument
  private readonly listeners = new Set<EditorStoreListener>()

  constructor(initialDocument: EditorDocument = createEmptyEditorDocument()) {
    this.doc = initialDocument
  }

  getSnapshot(): EditorDocument {
    return this.doc
  }

  setSnapshot(nextDocument: EditorDocument): void {
    if (Object.is(this.doc, nextDocument)) return
    this.doc = nextDocument
    this.emit()
  }

  update(updater: EditorDocumentUpdater): EditorDocument {
    const nextDocument = updater(this.doc)
    this.setSnapshot(nextDocument)
    return this.doc
  }

  subscribe(listener: EditorStoreListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.doc)
    }
  }
}
