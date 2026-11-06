---
title: SchedCP — adaptive Linux CPU scheduler
summary: Custom Linux CPU scheduling policies in eBPF that can be swapped live, with no kernel rebuild or reboot.
tech: [C, eBPF, sched_ext, Rust, Python, Linux]
role: Solo project · in progress
date: '2026'
order: 1
icon: terminal
featured: true
links:
  github: https://github.com/anushka0626/schedcp-custom
---

## Why I'm building it

The Linux scheduler decides which task runs where, and no single policy suits every workload. `sched_ext` lets you write scheduling policies as eBPF programs and load them into a running kernel. I wanted to see how far that goes: can the system switch its scheduling behaviour on the fly, without rebuilding the kernel?

## What it does

- **Two custom policies in restricted C:** a shared-queue FIFO with a 5 ms slice for bursty loads, and a per-core batch policy with a 30 ms slice that keeps caches warm.
- **A Rust control daemon** that compiles policies with `clang`, reads the kernel's `sched_ext` state from sysfs, and loads or unloads them safely. It speaks the Model Context Protocol, so an agent can drive it.
- **Python benchmarking tools** that run workloads with `sysbench` and collect `perf` counters.
- **A tuning loop** that spots too much preemption and swaps the scheduler while the machine keeps running.

## Results so far

I compare each policy against the default Linux scheduler (EEVDF) using context switches, CPU migrations and execution time. In VM tests, swapping policies cut context switches by about 67%, with up to 6.4% more throughput.

This is still in progress, so these numbers are from a VM and not real hardware yet.
