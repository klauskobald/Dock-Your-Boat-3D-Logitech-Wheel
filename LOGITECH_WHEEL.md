# Drive your boat with a Logitech steering wheel

This lets you steer your boat in the **Dock Your Boat** game using a Logitech
**Driving Force GT** steering wheel, its pedals are not used — you control the
boat with the wheel, the gear shifter and the buttons.

You do **not** need to be a computer person. Follow the steps below.

---

## 1. What you need

- ✅ The Logitech **Driving Force GT** steering wheel
- ✅ Its **power adapter** (the black power brick that plugs into the wall) — **this is required!**
- ✅ The **USB cable** from the wheel to your computer
- ✅ The **Dock Your Boat** game, running on the same computer
- ✅ A free program called **Node.js** (the setup will help you install it)

> ⚠️ **The single most important thing:** the wheel MUST be plugged into its
> power adapter. Without power it does nothing at all — no steering, no buttons.
> When it has power and you plug it in, the wheel turns by itself fully left and
> then right one time (a little self-test). If you see that wiggle, it's good.

---

## 2. One-time setup

### On a Mac

1. Open the **Terminal** app (press `Cmd` + `Space`, type `Terminal`, press Return).
2. In the Terminal window, type `bash` and then a **space**.
3. Drag the file **`Install_On_Mac.sh`** into the Terminal window.
4. Press **Return** and follow what it says.

### On Windows

1. Double-click **`Install_on_Windows.bat`**.
2. Follow what it says.

If Node.js is missing, the setup opens the download page for you. Install it
(click the big green **LTS** button), then run the setup again.

---

## 3. Start playing

1. Make sure the **wheel is powered** and plugged in (see the warning above).
2. Make sure the **Dock Your Boat** game is **running** on the same computer.
3. Start the wheel control:
   - **Mac:** run the setup again and answer **y** when it asks "Start the wheel now?",
     or type `npm run drive` in the Terminal.
   - **Windows:** double-click `Install_on_Windows.bat` and answer **y**,
     or type `npm run drive`.

You'll see lines like `steer ... rudder= 35% RIGHT` scrolling by. That means it's
working. To stop, press `Ctrl` + `C` (hold Control and press C).

---

## 4. The controls

| What you do on the wheel                          | What happens to the boat                        |
| ------------------------------------------------- | ----------------------------------------------- |
| **Turn the steering wheel**                       | Steers the boat (rudder), left and right        |
| **Gear shifter / paddle — UP**                    | Increases throttle (more forward power)         |
| **Gear shifter / paddle — DOWN**                  | Decreases throttle (slows down, then reverse)   |
| **X Reset button** (the one that zeroes throttle) | Gently brings **both** engines back to idle (0) |
| **D-pad LEFT** (the little 4-way pad)             | Bow thruster pushes the nose **left**           |
| **D-pad RIGHT**                                   | Bow thruster pushes the nose **right**          |

How the throttle feels:

- A quick **tap** of the up/down shifter makes a small step.
- **Holding** it keeps changing the throttle smoothly until you let go.
- Both engines (for two-engine boats) always get the **same** throttle value.
- The **reset** button slowly slides the throttle back to 0. It keeps going even
  after you let go — and it stops the moment you touch the shifter again.

---

## 5. If something doesn't work

**The wheel does nothing / no lines appear when I turn it**
- Check the **power adapter** is plugged into the wall and the wheel.
- Unplug and re-plug the wheel; watch for the left–right self-test wiggle.

**Left and right are swapped**
- Start it with the "invert" option:
  - Mac: `WHEEL_INVERT=1 npm run drive`
  - Windows: `set WHEEL_INVERT=1` then `npm run drive`

**It says it can't connect to the game**
- Make sure the game is open and running first.
- Make sure the game and this program are on the **same computer**.
- If the game runs on a **different** computer, start with its address:
  - Mac: `GAME_HOST=192.168.1.50 npm run drive` (use your game PC's address)
  - Windows: `set GAME_HOST=192.168.1.50` then `npm run drive`

**On Windows: a blue "Windows protected your PC" box appears**
- That can happen for `.bat` files. Click **More info → Run anyway**.

**On Windows: the wheel still does nothing even with power**
- If you have **Logitech G HUB** or **Logitech Gaming Software** installed, close
  it completely (right-click its tray icon → Quit). It can take exclusive control
  of the wheel and block this program.

**On Windows: the firewall (allowing the connection)**

The wheel program talks to the game over a network port (2612). Windows may step
in the first time:

- The **first time you open Dock Your Boat**, Windows may show a box titled
  *"Windows Defender Firewall has blocked some features of this app."* This is for
  **Dock Your Boat**, which needs to *receive* the connection. Tick the box for
  **Private networks** and click **Allow access**. If you click "Cancel" by
  mistake, the wheel won't be able to connect.
- You may see the **same box for "Node.js"** (the program running the wheel).
  Click **Allow access** for that too.
- If you already clicked Cancel before: open **Windows Security → Firewall &
  network protection → Allow an app through firewall**, find **Dock Your Boat**
  (and **Node.js**), and make sure they are checked.

> When the game and the wheel are on the **same computer**, this usually just
> works, but allow the boxes if they appear. If the game runs on a **different
> computer**, the firewall on *that* computer must allow incoming connections on
> port **2612** — allowing Dock Your Boat through the firewall (above) does this.

---

## 6. Good to know

- This works the same on **Mac** and **Windows**.
- You can leave the program running; it reconnects automatically if the game
  restarts.
- It only sends updates about **10 times per second**, so it won't flood the game.
