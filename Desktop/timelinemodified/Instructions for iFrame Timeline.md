How to Get Your Timeline into an iFrame (for Sharing!):

    Build Your Awesome Timeline:
        First, use the "Interactive Timeline" maker to add all your events, dates, sources, and annotations. Make it just the way you want it!

    Save Your Hard Work:
        Once your timeline is ready, click the "Save Timeline to File" button.
        This will download a special file (it ends in .json) to your computer. This file has all your timeline information.

    Put Your Timeline File on the Internet:
        For the iFrame to show your timeline on other websites, your saved .json file needs to be online where anyone can see it.
        A good, free place for this is GitHub Gist:
            Go to GitHub Gist.
            Copy all the text from your saved .json file (open it with a text editor like CotEditor or Notepad).
            Paste that text into the main box on the Gist page.
            Give your Gist a filename, like my_cool_timeline.json.
            Click the button to "Create public Gist."
            After it's created, look for a button that says "Raw". Click it.
            Now, copy the web address (URL) from your browser's address bar. This is the direct link to your timeline data!

    Tell the Timeline Maker Where Your Data Is:
        Go back to the "Interactive Timeline" maker page.
        Look for the section called "Export Timeline as iFrame".
        You'll see a box that says "URL of your Hosted Timeline JSON File:".
        Paste the "Raw" URL you copied from GitHub Gist into this box.

    Get Your iFrame Code:
        Click the "Generate iFrame Code" button.
        Magically, a bunch of code will appear in the text box below it (the one that says "Copy this iFrame Code:"). This is your special iFrame code!

    Copy Your Code:
        Click the "Copy Code" button that appeared next to the iFrame code. This will copy it to your computer's clipboard.

    Share Your Timeline!
        Now you can paste this iFrame code into any other webpage, blog, or platform that allows embedding iFrames (like ArcGIS StoryMaps!). Your timeline will then show up on that page.

One Important Note (for the person setting up the main timeline tool):
Make sure the VIEWER_BASE_URL at the very top of the script.js file is set to the correct web address where the viewer.html file lives online (for your GitHub repository, this is https://pstrootman.github.io/timelinemodified/viewer.html). If this isn't set right, the iFrame won't know where to find the viewer page.

And that's it! It might seem like a few steps, but once you do it once, it'll be easy. This way, your cool timelines can be shared far and wide!
