-- MesenCE 2.2.1. One private FIFO per worker; commands come from bridge/emulator.py.
local base = assert(os.getenv('KONG_BRIDGE_WORKER'))
local role=os.getenv('KONG_BRIDGE_ROLE') or 'probe'
local command = assert(io.open(base .. '/commands', 'r'))
local reply = assert(io.open(base .. '/replies', 'w'))
reply:setvbuf('no')
local steps, sequence, mask, snapshot = 0, 0, 0, 0
local hidden_count=0
local function guard(fn)
 return function(...)
  local ok,err=pcall(fn,...)
  if not ok then
   local f=io.open(base..'/error.txt','w');if f then f:write(tostring(err));f:close() end
   reply:write('ERROR ',tostring(err),'\n');emu.stop(2)
  end
 end
end
local buttons = {'b','y','select','start','up','down','left','right','a','x','l','r'}
if role=='host' then
 emu.addEventCallback(guard(function()
  hidden_count=0
  if emu.read(0x118,emu.memType.snesWorkRam)~=0x13 then return end
  for i=0,127 do
   local attr=emu.read(i*4+3,emu.memType.snesSpriteRam)
   local tile=emu.read(i*4+2,emu.memType.snesSpriteRam)|((attr&1)<<8)
   -- Yoshi's dynamic graphics and Baby Mario occupy tiles $00-$7f, palette 5.
   if ((attr>>1)&7)==5 and tile<0x80 then
    emu.write(i*4+1,0xf0,emu.memType.snesSpriteRam)
    hidden_count=hidden_count+1
   end
  end
 end),emu.eventType.startFrame)
end
local function memory(kind, size)
  local parts = {}
  for i=0,size-1,4 do parts[#parts+1]=string.pack('<I4',emu.read32(i,kind)) end
  return table.concat(parts)
end
local function dump()
  local f=assert(io.open(base .. '/snapshot.bin','wb'))
  local size=emu.getScreenSize()
  local pixels=emu.getScreenBuffer()
  f:write(string.pack('<I4I4I4',sequence,size.width,size.height))
  for y=0,size.height-1 do
    local row={}
    for x=1,size.width do row[x]=pixels[y*size.width+x] end
    f:write(string.pack('<'..string.rep('I4',size.width),table.unpack(row)))
  end
  for _, spec in ipairs({{'snesWorkRam',0x20000},{'gsuWorkRam',0x8000},{'snesVideoRam',0x10000},{'snesSpriteRam',544},{'snesCgRam',512}}) do
    local count=spec[2]
    if role~='probe' then
      if spec[1]=='snesWorkRam' then count=0x2000 end
      if spec[1]=='gsuWorkRam' then count=role=='host' and 0x2000 or 0 end
      if spec[1]=='snesVideoRam' then count=role=='donor' and 0x2000 or 0 end
      if spec[1]=='snesCgRam' and role=='host' then count=0 end
    end
    count=math.min(count,emu.getMemorySize(emu.memType[spec[1]]))
    if count>0 then f:write(memory(emu.memType[spec[1]],count)) end
    f:write(string.rep('\0',spec[2]-count))
  end
  f:close()
  local s=assert(io.open(base..'/state.txt','w'))
  for k,v in pairs(emu.getState()) do s:write(k,'=',tostring(v),'\n') end
  s:write('bridge.hiddenObjects=',hidden_count,'\n')
  s:close()
end
local function receive()
  local line=command:read('*l')
  if not line or line=='quit' then emu.stop(0);return end
  local id,n,m,shot,writes=line:match('^(%d+) (%d+) (%d+) (%d+) (.*)$')
  assert(id,'Invalid bridge command')
  sequence,steps,mask,snapshot=tonumber(id),tonumber(n),tonumber(m),tonumber(shot)
  for kind,addr,value,width in writes:gmatch('(%w+):(%x+):(%x+):(%d+)') do
    local a,v=tonumber(addr,16),tonumber(value,16)
    if width=='2' then emu.write16(a,v,assert(emu.memType[kind]))
    else emu.write(a,v,assert(emu.memType[kind])) end
  end
end
emu.addEventCallback(guard(function()
  local input={}
  for i,name in ipairs(buttons) do input[name]=(mask & (1 << (i-1))) ~= 0 end
  emu.setInput(input,0)
end),emu.eventType.inputPolled)
emu.addEventCallback(guard(function()
  steps=steps-1
  if steps<=0 then
    if snapshot==1 then dump() end
    reply:write(tostring(sequence),'\n')
    receive()
  end
end),emu.eventType.endFrame)
receive()
