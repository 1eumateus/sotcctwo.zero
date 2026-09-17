<template>
  <div class="pdf-viewer-container h-full flex flex-col">
    <div v-if="loading" class="p-4 text-center">
      <div class="inline-flex items-center gap-2">
        <div
          class="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"
        ></div>
        <span>Carregando PDF...</span>
      </div>
    </div>
    <div v-if="error" class="p-4 text-red-600 bg-red-50 m-4 rounded">
      {{ error }}
    </div>
    <div ref="containerRef" class="flex-1 overflow-y-auto p-4">
      <div
        v-for="(pageNum, idx) in pages"
        :key="`page-${pageNum}-${renderKey}`"
        class="page-wrapper mb-6 flex justify-center"
      >
        <canvas :id="`canvas-${idx}`" class="shadow-lg rounded"></canvas>
      </div>
    </div>
  </div>
</template>

<script>
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { markRaw } from "vue";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default {
  name: "PdfViewer",
  props: {
    pdfUrl: { type: String, required: true },
    comments: { type: Object, default: () => ({}) },
    zoomLevel: { type: Number, default: 1.0 },
  },
  data() {
    return {
      loading: false,
      error: null,
      pages: [],
      pdfDoc: null,
      isMounted: false,
      renderKey: 0,
      isRendering: false,
    };
  },
  mounted() {
    this.isMounted = true;
    this.$nextTick(() => this.loadPDF(this.pdfUrl));
    window.addEventListener("resize", this.handleResize);
  },
  beforeUnmount() {
    this.isMounted = false;
    window.removeEventListener("resize", this.handleResize);
    if (this.zoomTimer) clearTimeout(this.zoomTimer);
    if (this.resizeTimer) clearTimeout(this.resizeTimer);
    try {
      this.pdfDoc?.destroy?.();
    } catch (err) {
      console.error("Erro ao destruir o documento PDF:", err);
    }
  },
  watch: {
    pdfUrl(newUrl) {
      if (newUrl && this.isMounted) this.loadPDF(newUrl);
    },
    zoomLevel(newZoom, oldZoom) {
      if (!this.pdfDoc || !this.isMounted || newZoom === oldZoom) return;
      if (this.zoomTimer) clearTimeout(this.zoomTimer);
      this.zoomTimer = setTimeout(() => this.rerenderAllPages(), 150);
    },
  },
  methods: {
    async loadPDF(url) {
      if (!this.isMounted) return;
      this.loading = true;
      this.error = null;
      this.pages = [];

      try {
        const loadingTask = pdfjsLib.getDocument({ url });
        const pdf = await loadingTask.promise;
        if (!this.isMounted) return;

        this.pdfDoc = markRaw(pdf);
        this.pages = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
        await this.$nextTick();
        await this.renderAllPages();
      } catch (err) {
        console.error("Erro ao carregar PDF:", err);
        this.error =
          "Erro ao carregar o PDF. Verifique se o arquivo é válido e tente novamente.";
      } finally {
        this.loading = false;
      }
    },

    async renderAllPages() {
      if (!this.pdfDoc || !this.isMounted) return;

      for (let i = 0; i < this.pages.length; i++) {
        try {
          const page = await this.pdfDoc.getPage(this.pages[i]);
          await this.renderPage(page, i);
        } catch (err) {
          console.error(`Erro ao renderizar página ${i + 1}:`, err);
        }
      }
    },

    async renderPage(page, index) {
      if (!this.isMounted) return;
      const canvas = document.getElementById(`canvas-${index}`);
      const container = this.$refs.containerRef;

      if (!canvas || !container) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (!this.isMounted) return;
        return this.renderPage(page, index);
      }

      try {
        const containerWidth = container.clientWidth - 48;

        let baseWidth = Math.min(containerWidth, 1000);

        const scaledWidth = baseWidth * this.zoomLevel;

        const originalViewport = page.getViewport({ scale: 1 });
        const scale = scaledWidth / originalViewport.width;
        const viewport = page.getViewport({ scale: scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const context = canvas.getContext("2d");
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        await page.render({ canvasContext: context, viewport }).promise;
      } catch (err) {
        console.error(`Erro ao renderizar página ${index + 1}:`, err);
      }
    },

    async rerenderAllPages() {
      if (!this.pdfDoc || !this.isMounted || this.isRendering) return;

      this.isRendering = true;

      try {
        this.renderKey++;
        await this.$nextTick();
        await this.renderAllPages();
      } catch (err) {
        console.error("Erro ao re-renderizar páginas:", err);
      } finally {
        this.isRendering = false;
      }
    },

    handleResize() {
      if (this.resizeTimer) clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        if (this.pdfDoc && this.isMounted) {
          this.rerenderAllPages();
        }
      }, 150);
    },
  },
};
</script>

<style scoped>
.pdf-viewer-container {
  background: #f3f4f6;
}

.page-wrapper canvas {
  display: block;
  cursor: pointer;
  box-shadow:
    0 4px 6px -1px rgb(0 0 0 / 0.1),
    0 2px 4px -2px rgb(0 0 0 / 0.1);
  border-radius: 0.5rem;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #e5e7eb;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #9ca3af;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
