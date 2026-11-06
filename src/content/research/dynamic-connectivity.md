---
title: Cache-conscious fully dynamic graph connectivity
summary: When do memory layout and constant factors matter more than the algorithm? A study of dynamic connectivity on real hardware.
status: ongoing · draft paper
date: '2026'
order: 1
tags: [algorithms, data structures, performance, C++]
links:
  github: https://github.com/anushka0626/dynaconn-ett
---

Many real networks keep gaining and losing links, and a recurring question in them is "can A still reach B?" Theory offers clever structures with strong guarantees. I'm measuring how they behave on real hardware, where cache misses and memory layout often decide the running time.

The project has optimized C++20 implementations of the main structures, each in pointer-based and flat-array layouts that run identical algorithm code. There is also a benchmark suite of 231 workload traces, and the hypotheses were pre-registered before any measurement.

**Early results:** the flat layout speeds up ETT by 1.13–1.40×, D-tree by 1.04–1.48× and HDT by 1.62–2.35×. That is enough to reverse the order of HDT and D-tree at 10⁶ vertices. Some tests are still running, so these results are preliminary.
