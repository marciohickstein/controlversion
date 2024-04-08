SCRIPT_PATH="$0"
cd $(dirname $SCRIPT_PATH)
echo "### Enter in the folder $(pwd)."
echo ""
echo "### Installing server packages..."
npm install
echo ""
echo "### Installing client packages..."
cd client ; npm install