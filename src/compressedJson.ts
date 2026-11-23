// Static hosts may transparently decompress .gz responses.
export async function readCompressedJson(response: Response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    return await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
