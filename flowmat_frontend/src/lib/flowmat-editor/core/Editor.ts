import { EditorStore, type EditorStoreListener } from './EditorStore'
import type { EditorElement } from '../model/EditorElement'
import type { ElementId } from '../model/ElementId'
import type { EditorDocument } from '../model/EditorDocument'
import {
  deleteElements,
  getElementById,
  insertElement,
  replaceElement,
  selectElements,
  updateElement,
  withCamera,
} from '../model/EditorDocument'
import type { Camera } from '../model/Camera'

export class Editor {
  private readonly store: EditorStore

  constructor(initialDocument?: EditorDocument) {
    this.store = new EditorStore(initialDocument)
  }

  get document(): EditorDocument {
    return this.store.getSnapshot()
  }

  insertElement(element: EditorElement): EditorDocument {
    return this.store.update((doc) => insertElement(doc, element))
  }

  replaceElement(element: EditorElement): EditorDocument {
    return this.store.update((doc) => replaceElement(doc, element))
  }

  updateElement(id: ElementId, updater: (element: EditorElement) => EditorElement): EditorDocument {
    return this.store.update((doc) => updateElement(doc, id, updater))
  }

  deleteElements(ids: readonly ElementId[]): EditorDocument {
    return this.store.update((doc) => deleteElements(doc, ids))
  }

  selectElements(ids: readonly ElementId[]): EditorDocument {
    return this.store.update((doc) => selectElements(doc, ids))
  }

  setCamera(camera: Camera): EditorDocument {
    return this.store.update((doc) => withCamera(doc, camera))
  }

  getElementById(id: ElementId): EditorElement | undefined {
    return getElementById(this.document, id)
  }

  subscribe(listener: EditorStoreListener): () => void {
    return this.store.subscribe(listener)
  }
}
