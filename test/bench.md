leveldown += 50% 

i7 linux

    console.time test/store.test.ts:35
    add:1: 0ms
    console.time test/store.test.ts:40
    add:x10000: 979ms
    console.time test/store.test.ts:45
    findOne:9999: 0ms
    console.time test/store.test.ts:50
    findMany:10001: 247ms

i9 Windows

    console.time test/store.test.ts:35
        add:1: 1ms
    console.time test/store.test.ts:40
        add:x10000: 711ms
    console.time test/store.test.ts:45
        findOne:9999: 0ms
    console.time test/store.test.ts:50
        findMany:10001: 129ms

i7 Linux

    console.time test/store.test.ts:23
        add:1: 2ms
    console.time test/store.test.ts:28
        add:x10000: 1082ms
    console.time test/store.test.ts:33
        findOne:9999: 1ms
    console.time test/store.test.ts:38
        findMany:10001: 495ms

    // ...
    console.time test/store.test.ts:23
      add:1: 2ms
    console.time test/store.test.ts:28
      add:x10000: 1213ms
    console.time test/store.test.ts:33
      findOne:9999: 1ms
    console.time test/store.test.ts:38
      findMany:10001: 493ms
  
    // ...
    console.time test/store.test.ts:23
      add:1: 2ms
    console.time test/store.test.ts:28
      add:x10000: 1021ms
    console.time test/store.test.ts:33
      findOne:9999: 1ms
    console.time test/store.test.ts:38
      findMany:10001: 476ms
    // memoize
    console.time test/store.test.ts:23
      add:1: 1ms
    console.time test/store.test.ts:28
      add:x10000: 1018ms
    console.time test/store.test.ts:33
      findOne:9999: 0ms
    console.time test/store.test.ts:38
      findMany:10001: 459ms
    
    // memoize , jest --no-cache 
    console.time test/store.test.ts:23
      add:1: 0ms
    console.time test/store.test.ts:28
      add:x10000: 1043ms
    console.time test/store.test.ts:33
      findOne:9999: 0ms
    console.time test/store.test.ts:38
      findMany:10001: 485ms

    // no jest
    add:1: 0.809ms
    add:x10000: 733.55ms
    findOne:9999: 0.509ms
    findMany:10000: 469.371ms
    Done in 1.48s.