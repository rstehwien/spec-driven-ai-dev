#!/bin/zsh
# Regenerates every asset 001-gridsweep-replay.html loads from disk.
#
#   ./capture.sh
#
# Nothing here is drawn by hand. For each commit of the 001 cycle it checks the
# tree out of git, drives the real page in headless Chrome, and screenshots it;
# copies the four runtime files so the page can be played live in an iframe; and
# dumps `git show` for the commit into diffs.js.
#
# Needs: git, node, python3, and Google Chrome. Run it from this directory.
set -e
HERE=${0:A:h}
REPO=$HERE/../../..
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

rm -rf "$HERE/shots" "$HERE/game"
mkdir -p "$HERE/shots" "$HERE/game"

# --- the commits whose game state is worth looking at -----------------------
STAGE_SHAS=(2350a33 cd7f7e8 126811e 8dfa7b5 425d2b7 ce6e028)

for sha in $STAGE_SHAS; do
  mkdir -p "$WORK/$sha"
  (cd "$REPO" && git archive "$sha" examples/gridsweep) | tar -x -C "$WORK/$sha"
  src=$WORK/$sha/examples/gridsweep
  mkdir -p "$HERE/game/$sha"
  for f in index.html board.js ui.js styles.css; do
    [[ -f $src/$f ]] && cp "$src/$f" "$HERE/game/$sha/"
  done
done

# --- screenshot one game state ----------------------------------------------
# shot <sha> <out-name> <js actions>
#   rev(r,c) left-click   mark(r,c) right-click   focus(r,c) move the cursor
shot() {
  local sha=$1 out=$2 actions=$3
  local dir=$WORK/$sha/examples/gridsweep
  python3 - "$dir" "$actions" <<'PY'
import sys, io
d, act = sys.argv[1], sys.argv[2]
src = io.open(d + "/index.html", encoding="utf-8").read()
inject = """
<script>
(function(){
  var cells = document.querySelectorAll('#board .cell');
  function at(r,c){ return cells[r*8+c]; }
  function fire(el,t,i){ el.dispatchEvent(new MouseEvent(t, Object.assign({bubbles:true,cancelable:true,view:window}, i||{}))); }
  function rev(r,c){ var e=at(r,c); if(e) fire(e,'click'); }
  function mark(r,c){ var e=at(r,c); if(e) fire(e,'contextmenu',{button:2}); }
  function focus(r,c){ var e=at(r,c); if(e && e.focus) e.focus(); }
  try { ACTIONS } catch (err) { document.title = 'ERR ' + err.message; }
})();
</script>
"""
io.open(d + "/shot.html", "w", encoding="utf-8").write(
    src.replace("</body>", inject.replace("ACTIONS", act) + "\n</body>"))
PY
  "$CHROME" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
    --window-size=680,460 --virtual-time-budget=2500 \
    --screenshot="$WORK/raw.png" "file://$dir/shot.html" >/dev/null 2>&1
  sips -Z 960 "$WORK/raw.png" --out "$HERE/shots/$out" >/dev/null
  echo "  shots/$out"
}

# The fixed layout, so a win can be scripted without clicking 54 cells by hand.
WIN='var L=["........","......*.",".*..*...","......*.",".*.....*","...*....",".....*..","*..*...."];
     for(var r=0;r<8;r++){for(var c=0;c<8;c++){ if(L[r][c]===".") rev(r,c); }} focus(0,0);'

echo "Phase 01 - the dual-load stub"
shot 2350a33 01-stub.png ''

echo "Phase 03 - the grid, inert"
shot cd7f7e8 03-grid.png ''

echo "Phase 04 - a game being played, six frames"
shot 126811e 04-1.png 'focus(0,0);'
shot 126811e 04-2.png 'rev(0,0); focus(0,0);'
shot 126811e 04-3.png 'rev(0,0); focus(1,6);'
shot 126811e 04-4.png 'rev(0,0); mark(1,6); focus(2,1);'
shot 126811e 04-5.png 'rev(0,0); mark(1,6); mark(2,1); focus(4,4);'
shot 126811e 04-6.png 'rev(0,0); mark(1,6); mark(2,1); rev(4,4); rev(7,7); focus(4,4);'

echo "Phase 05 - the two ways a game ends"
shot 8dfa7b5 05-lose-1.png 'rev(0,0); mark(1,6); mark(2,1); rev(4,4); mark(5,0); focus(4,4);'
shot 8dfa7b5 05-lose-2.png 'rev(0,0); mark(1,6); mark(2,1); rev(4,4); mark(5,0); focus(2,4);'
shot 8dfa7b5 05-lose-3.png 'rev(0,0); mark(1,6); mark(2,1); rev(4,4); mark(5,0); rev(2,4);'
shot 8dfa7b5 05-win.png "$WIN"

# --- the diffs ---------------------------------------------------------------
echo "Diffs"
python3 - "$REPO" "$HERE/diffs.js" <<'PY'
import subprocess, sys, json, io
repo, out = sys.argv[1], sys.argv[2]
shas = ["e32e783","3087d07","9061655","8df5722","d1b7a4d","2350a33","9d694e8",
        "cd7f7e8","126811e","8dfa7b5","187fcd9","425d2b7","ce6e028","ac5be2e"]
d = {}
for s in shas:
    d[s] = subprocess.run(
        ["git", "-C", repo, "show", "--format=", "--unified=3", s, "--", "examples/gridsweep"],
        capture_output=True, text=True, check=True).stdout
body = "window.REPLAY_DIFFS = " + json.dumps(d, indent=0) + ";\n"
io.open(out, "w", encoding="utf-8").write(body)
print("  diffs.js  %d KB" % (len(body.encode()) // 1024))
PY

echo "Done."
