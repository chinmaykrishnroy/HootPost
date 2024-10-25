from PIL import Image

def make_white_transparent(input_image_path, output_image_path):
    # Open the image
    img = Image.open(input_image_path).convert("RGBA")
    
    # Get pixel data
    pixels = img.getdata()
    
    # Create a list to hold new pixel data
    new_pixels = []
    
    # Define the white color (adjust if needed)
    color = (5, 5, 5)
    
    # Loop over all pixels
    for pixel in pixels:
        # If the pixel is white, make it transparent
        if pixel[:3] == color:
            new_pixels.append((color[0], color[1], color[2], 0))  # Set alpha to 0 for transparency
        else:
            new_pixels.append(pixel)  # Keep the pixel unchanged
    
    # Update image data
    img.putdata(new_pixels)
    
    # Save the modified image (use a new file name to avoid conflicts)
    img.save(output_image_path, "PNG")

# Example usage:
input_image_path = r"C:\Users\morph\ConnectMeUI\assets\images\appwelcome.png"
output_image_path = r"C:\Users\morph\ConnectMeUI\assets\images\appwelcome.png"  # Save with a new name
make_white_transparent(input_image_path, output_image_path)

print("White pixels have been made transparent and the image is saved as", output_image_path)
