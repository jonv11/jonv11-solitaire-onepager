# Options

## Auto

The Auto feature moves any legal next-rank card to its suit foundation.

- **Sources scanned**: waste top first, then tableau columns left-to-right.
- **Legal move**: same suit and rank exactly one higher; an empty foundation accepts only the Ace of that suit.
- **Tableau**: Auto never moves cards between tableau piles. After moving from a tableau column, the newly exposed face-down card flips up if allowed.
- **Termination**: Auto loops until a full pass finds no moves or iteration/move caps (1000/500) trigger.
- **Animation**: Moves animate sequentially when animations are enabled. Set `AUTO_ANIMATE=false` to skip animation during tests.
