// Server state (DESIGN §Caching): BundleCorpus is immutable after
// construction, so refresh() constructs a NEW instance and flushes the
// viewer LRU — the same key can legitimately point at changed content (an
// incomplete bundle finalized; markers appended by the annotation workflow).
// skipInvalid keeps one corrupt manifest from bricking the server; invalid
// entries surface through corpus_overview.

import { BundleCorpus, BundleViewer } from 'civ-engine';
import type { SessionBundle } from 'civ-engine';

const VIEWER_LRU_SIZE = 4;

export class CorpusState {
  private corpus: BundleCorpus;
  private viewers = new Map<string, BundleViewer>(); // insertion-ordered LRU

  constructor(private readonly root: string) {
    this.corpus = new BundleCorpus(root, { skipInvalid: true });
  }

  get current(): BundleCorpus {
    return this.corpus;
  }

  refresh(): BundleCorpus {
    this.corpus = new BundleCorpus(this.root, { skipInvalid: true });
    this.viewers.clear();
    return this.corpus;
  }

  loadBundle(key: string): SessionBundle {
    return this.corpus.loadBundle(key);
  }

  viewer(key: string): BundleViewer {
    const cached = this.viewers.get(key);
    if (cached) {
      // refresh recency
      this.viewers.delete(key);
      this.viewers.set(key, cached);
      return cached;
    }
    const viewer = new BundleViewer(this.loadBundle(key));
    this.viewers.set(key, viewer);
    if (this.viewers.size > VIEWER_LRU_SIZE) {
      const oldest = this.viewers.keys().next().value as string;
      this.viewers.delete(oldest);
    }
    return viewer;
  }
}
